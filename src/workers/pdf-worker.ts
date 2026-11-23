import * as Comlink from "comlink";
import { PDFDocument } from "pdf-lib";
import { zipSync } from "fflate";
import {
	mergePdfs,
	PdfError,
	pdfPageCount,
	splitPdf,
} from "@/lib/pdf/merge-split";
import {
	PDF_QUALITY_JPEG,
	PDF_QUALITY_SCALE,
	type PdfQuality,
} from "@/lib/pdf/compress";

export type PdfCode = "empty" | "unreadable" | "range" | "failed";

export type PdfResult<T> =
	| { ok: true; value: T }
	| { ok: false; code: PdfCode };

function fail(unknown: unknown): { ok: false; code: PdfCode } {
	if (unknown instanceof PdfError) {
		return { ok: false, code: unknown.code };
	}
	return { ok: false, code: "failed" };
}

async function loadPdfjs() {
	const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
	return pdfjs;
}

// one open document at a time, the viewer replaces it on the next file.
let viewer: Awaited<
	ReturnType<Awaited<ReturnType<typeof loadPdfjs>>["getDocument"]>["promise"]
> | null = null;

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

	openPdf: async (bytes: ArrayBuffer): Promise<PdfResult<{ pages: number }>> => {
		try {
			const pdfjs = await loadPdfjs();
			if (viewer) {
				await viewer.destroy();
				viewer = null;
			}
			const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
			viewer = await task.promise;
			return { ok: true, value: { pages: viewer.numPages } };
		} catch (unknown) {
			viewer = null;
			return fail(unknown);
		}
	},

	renderPage: async (
		pageNumber: number,
		scale: number,
	): Promise<PdfResult<{ bitmap: ImageBitmap; width: number; height: number }>> => {
		try {
			if (!viewer) {
				return { ok: false, code: "unreadable" };
			}
			const page = await viewer.getPage(Math.max(1, Math.min(viewer.numPages, pageNumber)));
			const viewport = page.getViewport({ scale });
			const canvas = new OffscreenCanvas(
				Math.max(1, Math.floor(viewport.width)),
				Math.max(1, Math.floor(viewport.height)),
			);
			const context = canvas.getContext("2d");
			if (!context) {
				return { ok: false, code: "failed" };
			}
			await page.render({ canvasContext: context, viewport }).promise;
			const bitmap = canvas.transferToImageBitmap();
			return Comlink.transfer(
				{
					ok: true,
					value: { bitmap, width: canvas.width, height: canvas.height },
				},
				[bitmap],
			);
		} catch (unknown) {
			return fail(unknown);
		}
	},

	closePdf: async (): Promise<boolean> => {
		if (viewer) {
			await viewer.destroy();
			viewer = null;
		}
		return true;
	},

	compressPdf: async (
		bytes: ArrayBuffer,
		quality: PdfQuality,
		onProgress?: (done: number, total: number) => void,
	): Promise<PdfResult<{ bytes: Uint8Array; pages: number }>> => {
		try {
			const pdfjs = await loadPdfjs();
			const task = pdfjs.getDocument({ data: new Uint8Array(bytes) });
			const source = await task.promise;
			const output = await PDFDocument.create();
			const scale = PDF_QUALITY_SCALE[quality] ?? 1.4;
			const jpegQuality = PDF_QUALITY_JPEG[quality] ?? 0.72;
			for (let index = 1; index <= source.numPages; index += 1) {
				const page = await source.getPage(index);
				const box = page.getViewport({ scale: 1 });
				const viewport = page.getViewport({ scale });
				const canvas = new OffscreenCanvas(
					Math.max(1, Math.floor(viewport.width)),
					Math.max(1, Math.floor(viewport.height)),
				);
				const context = canvas.getContext("2d");
				if (!context) {
					throw new Error("canvas unavailable");
				}
				await page.render({ canvasContext: context, viewport }).promise;
				const blob = await canvas.convertToBlob({
					type: "image/jpeg",
					quality: jpegQuality,
				});
				const embedded = await output.embedJpg(await blob.arrayBuffer());
				const target = output.addPage([box.width, box.height]);
				target.drawImage(embedded, {
					x: 0,
					y: 0,
					width: box.width,
					height: box.height,
				});
				onProgress?.(index, source.numPages);
			}
			const saved = await output.save();
			await task.destroy();
			return { ok: true, value: { bytes: saved, pages: source.numPages } };
		} catch (unknown) {
			return fail(unknown);
		}
	},
};

export type PdfApi = typeof api;

Comlink.expose(api);