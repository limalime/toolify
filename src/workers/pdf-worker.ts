import * as Comlink from "comlink";
import { zipSync } from "fflate";
import type { PdfQuality } from "@/lib/pdf/compress";
import { compressPdfImages, type ImageCodec } from "@/lib/pdf/compress-images";
import {
	mergePdfs,
	PdfError,
	pdfPageCount,
	splitPdf,
} from "@/lib/pdf/merge-split";

export type PdfCode = "empty" | "unreadable" | "range" | "failed" | "cancelled";

// pdf.js resolves runtime assets against document.baseURI. a worker has no
// document, so keep the one property it reads available.
const scope = globalThis as typeof globalThis & {
	document?: { baseURI: string };
};
scope.document ??= { baseURI: self.location.href } as Document;

export type PdfResult<T> =
	| { ok: true; value: T }
	| { ok: false; code: PdfCode; detail?: string };

function fail(unknown: unknown): { ok: false; code: PdfCode; detail: string } {
	const detail =
		unknown instanceof Error
			? `${unknown.name}: ${unknown.message}`
			: String(unknown);
	if (unknown instanceof PdfError) {
		return { ok: false, code: unknown.code, detail };
	}
	return { ok: false, code: "failed", detail };
}

function cancelled(): { ok: false; code: "cancelled"; detail: string } {
	return { ok: false, code: "cancelled", detail: "render cancelled" };
}

function isRenderCancelled(unknown: unknown): boolean {
	return (
		typeof unknown === "object" &&
		unknown !== null &&
		"name" in unknown &&
		(unknown as { name?: string }).name === "RenderingCancelledException"
	);
}

// pdf.js draws inline images and soft masks through a canvas factory. the
// browser build defaults to document.createElement, which does not exist in a
// worker, so hand it an OffscreenCanvas factory instead.
class WorkerCanvasFactory {
	create(width: number, height: number) {
		const canvas = new OffscreenCanvas(
			Math.max(1, Math.floor(width)),
			Math.max(1, Math.floor(height)),
		);
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) {
			throw new Error("2d context unavailable");
		}
		return { canvas, context };
	}

	reset(entry: { canvas: OffscreenCanvas }, width: number, height: number) {
		entry.canvas.width = Math.max(1, Math.floor(width));
		entry.canvas.height = Math.max(1, Math.floor(height));
	}

	getNoAlphaContext(canvas: OffscreenCanvas) {
		return canvas.getContext("2d", {
			alpha: false,
			willReadFrequently: true,
		});
	}

	destroy(entry: {
		canvas: OffscreenCanvas | null;
		context: OffscreenCanvasRenderingContext2D | null;
	}) {
		const canvas = entry.canvas;
		if (canvas) {
			canvas.width = 0;
			canvas.height = 0;
		}
		entry.canvas = null;
		entry.context = null;
	}
}

// svg filter based effects need a DOM, so mirror pdf.js's own node factory
// and report no filter. text, images and shapes still draw normally.
class WorkerFilterFactory {
	addFilter() {
		return "none";
	}
	addHCMFilter() {
		return "none";
	}
	addAlphaFilter() {
		return "none";
	}
	addLuminosityFilter() {
		return "none";
	}
	addKnockoutFilter() {
		return "none";
	}
	addHighlightHCMFilter() {
		return "none";
	}
	addSelectionHCMFilter() {
		return "none";
	}
	addSelectionFilter() {
		return "none";
	}
	createSelectionStyle() {
		return null;
	}
	destroy() {}
}

async function loadPdfjs() {
	const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
	return pdfjs;
}

// fonts, cmaps, wasm image decoders and colour profiles are served from
// public/pdfjs, without them pdf.js draws tofu text and refuses to decode
// jbig2 and jpeg2000 scans. sync-pdfjs-assets.mjs keeps this folder current.
// pdf.js resolves these against document.baseURI. workers have no real
// document, so hand it absolute urls instead of relying on the shim above.
const origin = self.location.origin;
const documentOptions = {
	cMapUrl: `${origin}/pdfjs/cmaps/`,
	cMapPacked: true,
	standardFontDataUrl: `${origin}/pdfjs/standard_fonts/`,
	wasmUrl: `${origin}/pdfjs/wasm/`,
	iccUrl: `${origin}/pdfjs/iccs/`,
	// without this pdf.js probes document.baseURI, which workers do not have
	useWorkerFetch: false,
	// render with the bundled Foxit fonts, system font lookup is unreliable
	// inside a worker and shows up as boxes on some linux fonts
	useSystemFonts: false,
	// FontFace has no document to attach to inside this worker
	disableFontFace: true,
	CanvasFactory: WorkerCanvasFactory,
	FilterFactory: WorkerFilterFactory,
};

// a huge page at a high zoom can exceed the largest canvas the browser will
// allocate, cap the long edge and let css scale the bitmap instead.
const MAX_EDGE = 4096;

// one open document at a time, the viewer replaces it on the next file.
let viewer: Awaited<
	ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]
> | null = null;
let viewerTask: ReturnType<
	Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]
> | null = null;

type RenderTask = { cancel: () => void; promise: Promise<void> };

let activeRender: RenderTask | null = null;
let renderRequest = 0;
let renderQueue: Promise<unknown> = Promise.resolve();

async function stopRenders() {
	renderRequest += 1;
	activeRender?.cancel();
	activeRender = null;
	await renderQueue.catch(() => undefined);
}

async function renderCurrentPage(
	pageNumber: number,
	scale: number,
	request: number,
): Promise<PdfResult<{ bitmap: ImageBitmap; width: number; height: number }>> {
	if (!viewer) {
		return fail(new Error("no document"));
	}
	const page = await viewer.getPage(
		Math.max(1, Math.min(viewer.numPages, pageNumber)),
	);
	if (request !== renderRequest) {
		return cancelled();
	}
	const base = page.getViewport({ scale: 1 });
	const limit = MAX_EDGE / Math.max(base.width, base.height);
	const viewport = page.getViewport({ scale: Math.min(scale, limit) });
	const canvas = new OffscreenCanvas(
		Math.max(1, Math.floor(viewport.width)),
		Math.max(1, Math.floor(viewport.height)),
	);
	const context = canvas.getContext("2d");
	if (!context) {
		return fail(new Error("canvas unavailable"));
	}
	let task: RenderTask | null = null;
	try {
		task = page.render({ canvasContext: context, viewport }) as RenderTask;
		activeRender = task;
		await task.promise;
	} catch (unknown) {
		if (isRenderCancelled(unknown)) {
			return cancelled();
		}
		throw unknown;
	} finally {
		if (activeRender === task) {
			activeRender = null;
		}
	}
	if (request !== renderRequest) {
		return cancelled();
	}
	const bitmap = canvas.transferToImageBitmap();
	return Comlink.transfer(
		{
			ok: true,
			value: { bitmap, width: canvas.width, height: canvas.height },
		},
		[bitmap],
	);
}

async function transcodeJpeg(
	bytes: Uint8Array,
	width: number,
	height: number,
	quality: number,
): Promise<Uint8Array | null> {
	const buffer = bytes.slice().buffer as ArrayBuffer;
	const bitmap = await createImageBitmap(
		new Blob([buffer], { type: "image/jpeg" }),
	);
	try {
		const canvas = new OffscreenCanvas(width, height);
		const context = canvas.getContext("2d");
		if (!context) {
			return null;
		}
		context.drawImage(bitmap, 0, 0, width, height);
		const blob = await canvas.convertToBlob({
			type: "image/jpeg",
			quality,
		});
		return new Uint8Array(await blob.arrayBuffer());
	} finally {
		bitmap.close();
	}
}

async function encodeRgba(
	rgba: Uint8Array,
	width: number,
	height: number,
	targetWidth: number,
	targetHeight: number,
	quality: number,
): Promise<Uint8Array | null> {
	const source = new OffscreenCanvas(width, height);
	const sourceContext = source.getContext("2d");
	if (!sourceContext) {
		return null;
	}
	sourceContext.putImageData(
		new ImageData(new Uint8ClampedArray(rgba), width, height),
		0,
		0,
	);
	const target = new OffscreenCanvas(targetWidth, targetHeight);
	const context = target.getContext("2d");
	if (!context) {
		return null;
	}
	context.drawImage(source, 0, 0, targetWidth, targetHeight);
	const blob = await target.convertToBlob({ type: "image/jpeg", quality });
	return new Uint8Array(await blob.arrayBuffer());
}

const imageCodec: ImageCodec = { transcodeJpeg, encodeRgba };

const api = {
	ping: () => true,

	pageCount: async (bytes: ArrayBuffer): Promise<PdfResult<number>> => {
		try {
			return { ok: true, value: await pdfPageCount(bytes) };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	merge: async (
		payload: { files: ArrayBuffer[] },
		onProgress?: (done: number, total: number) => void,
	): Promise<PdfResult<{ bytes: Uint8Array; pages: number }>> => {
		try {
			const value = await mergePdfs(payload.files, (done, total) =>
				onProgress?.(done, total),
			);
			const pages = await pdfPageCount(value);
			return { ok: true, value: { bytes: value, pages } };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	split: async (
		payload: { bytes: ArrayBuffer; groups: number[][] },
		onProgress?: (done: number, total: number) => void,
	): Promise<PdfResult<Uint8Array[]>> => {
		try {
			const value = await splitPdf(
				payload.bytes,
				payload.groups,
				(done, total) => onProgress?.(done, total),
			);
			return { ok: true, value };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	zip: async (
		files: Array<{ name: string; bytes: Uint8Array }>,
	): Promise<PdfResult<Uint8Array>> => {
		try {
			const entries: Record<string, Uint8Array> = {};
			for (const file of files) {
				entries[file.name] = file.bytes;
			}
			return { ok: true, value: zipSync(entries) };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	openPdf: async (
		bytes: ArrayBuffer,
	): Promise<PdfResult<{ pages: number }>> => {
		try {
			await stopRenders();
			const pdfjs = await loadPdfjs();
			if (viewerTask) {
				await viewerTask.destroy();
			}
			viewer = null;
			viewerTask = null;
			const task = pdfjs.getDocument({
				...documentOptions,
				data: new Uint8Array(bytes),
			});
			viewerTask = task;
			viewer = await task.promise;
			return { ok: true, value: { pages: viewer.numPages } };
		} catch (unknown) {
			viewer = null;
			viewerTask = null;
			return fail(unknown);
		}
	},

	renderPage: (
		pageNumber: number,
		scale: number,
	): Promise<
		PdfResult<{ bitmap: ImageBitmap; width: number; height: number }>
	> => {
		const request = ++renderRequest;
		const job = renderQueue.then(async () => {
			if (request !== renderRequest) {
				return cancelled();
			}
			return renderCurrentPage(pageNumber, scale, request);
		});
		renderQueue = job.then(
			() => undefined,
			() => undefined,
		);
		return job;
	},

	cancelRender: async (): Promise<boolean> => {
		renderRequest += 1;
		const task = activeRender;
		activeRender = null;
		task?.cancel();
		return task !== null;
	},

	closePdf: async (): Promise<boolean> => {
		await stopRenders();
		if (viewerTask) {
			await viewerTask.destroy();
		}
		viewer = null;
		viewerTask = null;
		return true;
	},

	compressPdf: async (
		bytes: ArrayBuffer,
		quality: PdfQuality,
		onProgress?: (done: number, total: number) => void,
	): Promise<
		PdfResult<{
			bytes: Uint8Array;
			pages: number;
			images: number;
			replaced: number;
		}>
	> => {
		try {
			const value = await compressPdfImages(new Uint8Array(bytes), {
				quality,
				codec: imageCodec,
				onProgress: (done, total) => onProgress?.(done, total),
			});
			return { ok: true, value };
		} catch (unknown) {
			console.error("pdf compress failed", unknown);
			return fail(unknown);
		}
	},
};

export type PdfApi = typeof api;

Comlink.expose(api);
