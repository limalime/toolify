import * as Comlink from "comlink";
import {
	adjustPixel,
	type EnhanceOptions,
	sharpenPlane,
} from "@/lib/images/enhance";
import { buildIco, parseIco, pickPngEntry } from "@/lib/images/ico";
import { embedRasterSvg, ensureSvgSize, svgSize } from "@/lib/images/svg";
import { tileGrid } from "@/lib/images/tiles";

export type OutputFormat =
	| "png"
	| "jpg"
	| "webp"
	| "avif"
	| "ico"
	| "pdf"
	| "svg";

export interface DecodedImage {
	image: ImageData;
	width: number;
	height: number;
}

export interface EncodedImage {
	bytes: ArrayBuffer;
	mime: string;
	extension: string;
}

const BITMAP_INPUTS = new Set(["png", "jpg", "jpeg", "webp", "avif"]);
const MAX_RASTER_EDGE = 4096;

// boot check so a worker that never comes up fails fast instead of
// hanging every tool call behind it forever.
export async function ping(): Promise<string> {
	return "pong";
}

function extensionOf(filename: string): string {
	const dot = filename.lastIndexOf(".");
	return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "";
}

async function bitmapToImage(bitmap: ImageBitmap): Promise<DecodedImage> {
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.drawImage(bitmap, 0, 0);
	bitmap.close();
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	return { image, width: canvas.width, height: canvas.height };
}

async function decodeHeic(bytes: ArrayBuffer): Promise<DecodedImage> {
	const { default: libheif } = await import("libheif-js/wasm-bundle");
	const decoder = new libheif.HeifDecoder();
	const images = decoder.decode(new Uint8Array(bytes));
	const first = images[0];
	if (!first) {
		throw new Error("no image found");
	}
	const width = first.get_width();
	const height = first.get_height();
	const target = {
		data: new Uint8ClampedArray(width * height * 4),
		width,
		height,
	};
	const decoded = await new Promise<{
		data: Uint8ClampedArray;
		width: number;
		height: number;
	}>((resolve, reject) => {
		first.display(target, (data) => {
			if (!data) {
				reject(new Error("heic decode failed"));
			} else {
				resolve({
					data: new Uint8ClampedArray(data.data),
					width: data.width,
					height: data.height,
				});
			}
		});
	});
	return {
		image: new ImageData(
			new Uint8ClampedArray(decoded.data),
			decoded.width,
			decoded.height,
		),
		width: decoded.width,
		height: decoded.height,
	};
}

async function decodePdf(bytes: ArrayBuffer): Promise<DecodedImage> {
	const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
	const loadingTask = pdfjs.getDocument({ data: new Uint8Array(bytes) });
	const document = await loadingTask.promise;
	const page = await document.getPage(1);
	const box = page.getViewport({ scale: 1 });
	const scale = Math.min(2, MAX_RASTER_EDGE / Math.max(box.width, box.height));
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
	await loadingTask.destroy();
	const image = context.getImageData(0, 0, canvas.width, canvas.height);
	return { image, width: canvas.width, height: canvas.height };
}

async function decodeSvg(bytes: ArrayBuffer): Promise<DecodedImage> {
	const markup = new TextDecoder().decode(
		new Uint8Array(bytes).slice(0, 200000),
	);
	const size = svgSize(markup);
	if (!size) {
		throw new Error("svg needs width and height");
	}
	const scale = Math.min(
		1,
		MAX_RASTER_EDGE / Math.max(size.width, size.height),
	);
	const width = Math.max(1, Math.floor(size.width * scale));
	const height = Math.max(1, Math.floor(size.height * scale));
	const sized = ensureSvgSize(markup, { width, height });
	const blob = new Blob([sized], { type: "image/svg+xml" });
	const bitmap = await createImageBitmap(blob);
	return bitmapToImage(bitmap);
}

async function decodeIco(bytes: ArrayBuffer): Promise<DecodedImage> {
	const entry = pickPngEntry(parseIco(new Uint8Array(bytes)));
	const blob = new Blob([entry.bytes.slice()], { type: "image/png" });
	const bitmap = await createImageBitmap(blob);
	return bitmapToImage(bitmap);
}

async function decodeStandard(bytes: ArrayBuffer): Promise<DecodedImage> {
	const blob = new Blob([bytes.slice(0)]);
	const bitmap = await createImageBitmap(blob, {
		imageOrientation: "from-image",
	});
	return bitmapToImage(bitmap);
}

// reads any accepted input into raw pixels. throws plain errors the ui shows as is.
export async function decodeInput(
	bytes: ArrayBuffer,
	filename: string,
): Promise<DecodedImage> {
	const extension = extensionOf(filename);
	if (extension === "heic" || extension === "heif") {
		return decodeHeic(bytes);
	}
	if (extension === "ai" || extension === "pdf") {
		return decodePdf(bytes);
	}
	if (extension === "svg") {
		return decodeSvg(bytes);
	}
	if (extension === "ico") {
		return decodeIco(bytes);
	}
	if (BITMAP_INPUTS.has(extension)) {
		return decodeStandard(bytes);
	}
	throw new Error(`"${extension || filename}" is not a supported image`);
}

function compositeOver(image: ImageData, background: string): ImageData {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.fillStyle = background;
	context.fillRect(0, 0, canvas.width, canvas.height);
	const source = new OffscreenCanvas(image.width, image.height);
	const sourceContext = source.getContext("2d");
	if (!sourceContext) {
		throw new Error("canvas unavailable");
	}
	sourceContext.putImageData(image, 0, 0);
	context.drawImage(source, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

async function rasterToDataUrl(
	image: ImageData,
	mime: string,
	quality: number,
): Promise<string> {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.putImageData(image, 0, 0);
	const blob = await canvas.convertToBlob({
		type: mime,
		quality: quality / 100,
	});
	const buffer = await blob.arrayBuffer();
	let binary = "";
	const bytes = new Uint8Array(buffer);
	for (let index = 0; index < bytes.length; index++) {
		binary += String.fromCharCode(bytes[index] as number);
	}
	return `data:${mime};base64,${btoa(binary)}`;
}

async function encodePdf(
	image: ImageData,
	quality: number,
): Promise<ArrayBuffer> {
	const { jsPDF } = await import("jspdf");
	const url = await rasterToDataUrl(image, "image/jpeg", quality);
	const orientation = image.width >= image.height ? "landscape" : "portrait";
	const document = new jsPDF({
		unit: "pt",
		format: [image.width, image.height],
		orientation,
	});
	document.addImage(url, "JPEG", 0, 0, image.width, image.height);
	return document.output("arraybuffer") as ArrayBuffer;
}

async function encodeIco(
	image: ImageData,
	background: string,
): Promise<ArrayBuffer> {
	const flat = compositeOver(image, background);
	const longest = Math.max(flat.width, flat.height, 1);
	const scale = Math.min(1, 256 / longest);
	const width = Math.max(1, Math.round(flat.width * scale));
	const height = Math.max(1, Math.round(flat.height * scale));
	const canvas = new OffscreenCanvas(256, 256);
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.fillStyle = background;
	context.fillRect(0, 0, 256, 256);
	const source = new OffscreenCanvas(flat.width, flat.height);
	const sourceContext = source.getContext("2d");
	if (!sourceContext) {
		throw new Error("canvas unavailable");
	}
	sourceContext.putImageData(flat, 0, 0);
	context.drawImage(
		source,
		Math.floor((256 - width) / 2),
		Math.floor((256 - height) / 2),
		width,
		height,
	);
	const square = context.getImageData(0, 0, 256, 256);
	const { optimise } = await import("./oxipng-st");
	const png = await optimise(square, { level: 2 });
	return buildIco(new Uint8Array(png), 256).buffer as ArrayBuffer;
}

// encodes pixels to any output format. lossy formats take quality 0 to 100,
// opaque formats composite the background color first.
export async function encodeImage(
	image: ImageData,
	format: OutputFormat,
	quality: number,
	background: string,
): Promise<EncodedImage> {
	switch (format) {
		case "jpg": {
			const flat = compositeOver(image, background);
			const { encode } = await import("@jsquash/jpeg");
			return {
				bytes: await encode(flat, { quality }),
				mime: "image/jpeg",
				extension: "jpg",
			};
		}
		case "webp": {
			const { encode } = await import("@jsquash/webp");
			return {
				bytes: await encode(image, { quality }),
				mime: "image/webp",
				extension: "webp",
			};
		}
		case "avif": {
			const { default: encode } = await import("./avif-st");
			return {
				bytes: await encode(image, { quality }),
				mime: "image/avif",
				extension: "avif",
			};
		}
		case "png": {
			const { optimise } = await import("./oxipng-st");
			return {
				bytes: await optimise(image, { level: 4 }),
				mime: "image/png",
				extension: "png",
			};
		}
		case "ico": {
			return {
				bytes: await encodeIco(image, background),
				mime: "image/x-icon",
				extension: "ico",
			};
		}
		case "pdf": {
			const flat = compositeOver(image, background);
			return {
				bytes: await encodePdf(flat, quality),
				mime: "application/pdf",
				extension: "pdf",
			};
		}
		case "svg": {
			const flat = compositeOver(image, background);
			const url = await rasterToDataUrl(flat, "image/jpeg", quality);
			const markup = embedRasterSvg(url, flat.width, flat.height);
			return {
				bytes: new TextEncoder().encode(markup).buffer as ArrayBuffer,
				mime: "image/svg+xml",
				extension: "svg",
			};
		}
	}
}

export async function resizeImage(
	image: ImageData,
	width: number,
	height: number,
): Promise<ImageData> {
	const { default: resize } = await import("@jsquash/resize");
	return resize(image, { width, height });
}

export async function cropImage(
	image: ImageData,
	x: number,
	y: number,
	width: number,
	height: number,
): Promise<ImageData> {
	const canvas = new OffscreenCanvas(image.width, image.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.putImageData(image, 0, 0);
	const cut = context.getImageData(x, y, width, height);
	const out = new OffscreenCanvas(width, height);
	const outContext = out.getContext("2d");
	if (!outContext) {
		throw new Error("canvas unavailable");
	}
	outContext.putImageData(cut, 0, 0);
	return outContext.getImageData(0, 0, width, height);
}

export async function compositeImage(
	base: ImageData,
	overlay: ImageData,
	x: number,
	y: number,
	opacity: number,
): Promise<ImageData> {
	const canvas = new OffscreenCanvas(base.width, base.height);
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.putImageData(base, 0, 0);
	const layer = new OffscreenCanvas(overlay.width, overlay.height);
	const layerContext = layer.getContext("2d");
	if (!layerContext) {
		throw new Error("canvas unavailable");
	}
	layerContext.putImageData(overlay, 0, 0);
	context.globalAlpha = Math.min(1, Math.max(0, opacity));
	context.drawImage(layer, Math.round(x), Math.round(y));
	context.globalAlpha = 1;
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

// plain pixel math, no model. brightness and contrast and saturation in
// one pass, sharpness as a 3x3 second pass. alpha is never touched.
export async function adjustImage(
	image: ImageData,
	width: number,
	height: number,
	options: EnhanceOptions,
): Promise<ImageData> {
	const out = new ImageData(width, height);
	const source = image.data;
	const target = out.data;
	for (let index = 0; index < source.length; index += 4) {
		const [red, green, blue] = adjustPixel(
			source[index] as number,
			source[index + 1] as number,
			source[index + 2] as number,
			options,
		);
		target[index] = red;
		target[index + 1] = green;
		target[index + 2] = blue;
		target[index + 3] = source[index + 3] as number;
	}
	if (options.sharpness !== 0) {
		target.set(sharpenPlane(target, width, height, options.sharpness));
	}
	return out;
}

export interface BgRemovalOptions {
	publicPath: string;
	model: "isnet_quint8" | "isnet_fp16";
	device: "cpu" | "gpu";
}

export type BgRemovalProgress = (
	stage: "download" | "inference",
	current: number,
	total: number,
) => void;

// isnet segmentation through imgly, model and wasm stream from R2.
export async function removeBackgroundImage(
	bytes: ArrayBuffer,
	mime: string,
	options: BgRemovalOptions,
	onProgress?: BgRemovalProgress,
): Promise<EncodedImage> {
	const { removeBackground } = await import("@imgly/background-removal");
	const blob = await removeBackground(new Blob([bytes], { type: mime }), {
		publicPath: options.publicPath,
		model: options.model,
		device: options.device,
		output: { format: "image/png", quality: 1 },
		progress: (key: string, current: number, total: number) => {
			onProgress?.(
				key.startsWith("fetch:") ? "download" : "inference",
				current,
				total,
			);
		},
	});
	return {
		bytes: await blob.arrayBuffer(),
		mime: "image/png",
		extension: "png",
	};
}

export interface UpscaleOptions {
	modelUrl: string;
	wasmBase: string;
	scale: 2 | 4;
}

export type UpscaleProgress = (
	stage: "download" | "upscale",
	current: number,
	total: number,
) => void;

export interface UpscaledImage {
	image: ImageData;
	width: number;
	height: number;
	device: "webgpu" | "wasm";
}

const UPSCALE_TILE = 256;
const UPSCALE_OVERLAP = 16;
const MODEL_SCALE = 4;

async function fetchWithProgress(
	url: string,
	onProgress?: UpscaleProgress,
): Promise<ArrayBuffer> {
	const response = await fetch(url);
	if (!response.ok || !response.body) {
		throw new Error(`model download failed (${response.status})`);
	}
	const total = Number(response.headers.get("content-length") ?? 0);
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}
		chunks.push(value);
		received += value.byteLength;
		onProgress?.("download", received, total);
	}
	const merged = new Uint8Array(received);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return merged.buffer as ArrayBuffer;
}

async function detectWebGpu(): Promise<boolean> {
	const gpu = (globalThis.navigator as unknown as { gpu?: unknown } | undefined)
		?.gpu as { requestAdapter(): Promise<unknown> } | undefined;
	if (!gpu) {
		return false;
	}
	try {
		return (await gpu.requestAdapter()) !== null;
	} catch {
		return false;
	}
}

function tileToTensor(tile: ImageData): Float32Array {
	const plane = tile.width * tile.height;
	const tensor = new Float32Array(plane * 3);
	const data = tile.data;
	for (let index = 0; index < plane; index++) {
		tensor[index] = (data[index * 4] as number) / 255;
		tensor[index + plane] = (data[index * 4 + 1] as number) / 255;
		tensor[index + plane * 2] = (data[index * 4 + 2] as number) / 255;
	}
	return tensor;
}

// realesr x4 tiled, rgb through the model and alpha through smooth canvas
// scaling. webgpu when the browser offers it, wasm otherwise, and the
// caller is told which one ran.
export async function upscaleImage(
	image: ImageData,
	options: UpscaleOptions,
	onProgress?: UpscaleProgress,
): Promise<UpscaledImage> {
	const ort = await import("onnxruntime-web");
	const webgpu = await detectWebGpu();
	const suffix = webgpu ? ".jsep" : "";
	ort.env.wasm.wasmPaths = {
		mjs: `${options.wasmBase}/ort-wasm-simd-threaded${suffix}.mjs`,
		wasm: `${options.wasmBase}/ort-wasm-simd-threaded${suffix}.wasm`,
	};
	const isolated =
		typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
	ort.env.wasm.numThreads = isolated
		? Math.max(1, Math.min(4, globalThis.navigator?.hardwareConcurrency ?? 4))
		: 1;
	const model = await fetchWithProgress(options.modelUrl, onProgress);
	let session: Awaited<ReturnType<typeof ort.InferenceSession.create>>;
	let device: "webgpu" | "wasm" = webgpu ? "webgpu" : "wasm";
	try {
		session = await ort.InferenceSession.create(model, {
			executionProviders: [device],
		});
	} catch (unknown) {
		if (!webgpu) {
			throw unknown;
		}
		session = await ort.InferenceSession.create(model, {
			executionProviders: ["wasm"],
		});
		device = "wasm";
	}
	const outWidth = image.width * MODEL_SCALE;
	const outHeight = image.height * MODEL_SCALE;
	const out = new ImageData(outWidth, outHeight);
	const tiles = tileGrid(
		image.width,
		image.height,
		UPSCALE_TILE,
		UPSCALE_OVERLAP,
		MODEL_SCALE,
	);
	let done = 0;
	for (const tile of tiles) {
		const canvas = new OffscreenCanvas(image.width, image.height);
		const context = canvas.getContext("2d");
		if (!context) {
			throw new Error("canvas unavailable");
		}
		context.putImageData(image, 0, 0);
		const piece = context.getImageData(tile.x, tile.y, tile.width, tile.height);
		const input = new ort.Tensor("float32", tileToTensor(piece), [
			1,
			3,
			piece.height,
			piece.width,
		]);
		const feeds: Record<string, typeof input> = {};
		feeds[session.inputNames[0] as string] = input;
		const results = await session.run(feeds);
		const output = results[session.outputNames[0] as string];
		if (!output) {
			throw new Error("upscale produced no output");
		}
		const data = output.data as Float32Array;
		const plane = tile.width * MODEL_SCALE * (tile.height * MODEL_SCALE);
		const keepX = Math.round((tile.outX / MODEL_SCALE - tile.x) * MODEL_SCALE);
		const keepY = Math.round((tile.outY / MODEL_SCALE - tile.y) * MODEL_SCALE);
		for (let y = 0; y < tile.outHeight; y++) {
			for (let x = 0; x < tile.outWidth; x++) {
				const sx = keepX + x;
				const sy = keepY + y;
				const source = sy * tile.width * MODEL_SCALE + sx;
				const target = ((tile.outY + y) * outWidth + (tile.outX + x)) * 4;
				out.data[target] =
					Math.max(0, Math.min(1, data[source] as number)) * 255;
				out.data[target + 1] =
					Math.max(0, Math.min(1, data[source + plane] as number)) * 255;
				out.data[target + 2] =
					Math.max(0, Math.min(1, data[source + plane * 2] as number)) * 255;
				out.data[target + 3] = 255;
			}
		}
		done += 1;
		onProgress?.("upscale", done, tiles.length);
	}
	await session.release?.();
	const alpha = new OffscreenCanvas(image.width, image.height);
	const alphaContext = alpha.getContext("2d");
	if (!alphaContext) {
		throw new Error("canvas unavailable");
	}
	alphaContext.putImageData(image, 0, 0);
	const scaled = new OffscreenCanvas(outWidth, outHeight);
	const scaledContext = scaled.getContext("2d", { willReadFrequently: true });
	if (!scaledContext) {
		throw new Error("canvas unavailable");
	}
	scaledContext.imageSmoothingEnabled = true;
	scaledContext.drawImage(alpha, 0, 0, outWidth, outHeight);
	const alphaData = scaledContext.getImageData(0, 0, outWidth, outHeight).data;
	for (let index = 0; index < outWidth * outHeight; index++) {
		out.data[index * 4 + 3] = alphaData[index * 4 + 3] as number;
	}
	if (options.scale === MODEL_SCALE) {
		return { image: out, width: outWidth, height: outHeight, device };
	}
	const half = new OffscreenCanvas(image.width * 2, image.height * 2);
	const halfContext = half.getContext("2d");
	if (!halfContext) {
		throw new Error("canvas unavailable");
	}
	const full = new OffscreenCanvas(outWidth, outHeight);
	const fullContext = full.getContext("2d");
	if (!fullContext) {
		throw new Error("canvas unavailable");
	}
	fullContext.putImageData(out, 0, 0);
	halfContext.imageSmoothingEnabled = true;
	halfContext.imageSmoothingQuality = "high";
	halfContext.drawImage(full, 0, 0, half.width, half.height);
	const down = halfContext.getImageData(0, 0, half.width, half.height);
	return { image: down, width: half.width, height: half.height, device };
}

export interface TraceOptions {
	colors: number;
	corner: number;
	speckle: number;
}

interface VtracerModule {
	default(init: { module_or_path: string }): Promise<unknown>;
	trace_rgba(
		pixels: Uint8Array,
		width: number,
		height: number,
		colorPrecision: number,
		cornerThreshold: number,
		filterSpeckle: number,
	): string;
}

let vtracerModule: VtracerModule | null = null;

async function ensureVtracer(): Promise<VtracerModule> {
	if (!vtracerModule) {
		// blob import keeps the bundler out: the glue never resolves at
		// build time, and init gets an explicit wasm url.
		const source = await (await fetch("/vtracer/vtracer.js")).text();
		const url = URL.createObjectURL(
			new Blob([source], { type: "text/javascript" }),
		);
		try {
			const module = (await import(
				/* webpackIgnore: true */ url
			)) as VtracerModule;
			await module.default({ module_or_path: "/vtracer/vtracer_bg.wasm" });
			vtracerModule = module;
		} finally {
			URL.revokeObjectURL(url);
		}
	}
	return vtracerModule;
}

// real vector tracing through the rust wasm build, loaded outside the
// js bundler so its bytes never touch the app bundle.
export async function tracePng(
	image: ImageData,
	options: TraceOptions,
): Promise<string> {
	const api = await ensureVtracer();
	return api.trace_rgba(
		new Uint8Array(image.data),
		image.width,
		image.height,
		options.colors,
		options.corner,
		options.speckle,
	);
}

export const api = {
	ping,
	decodeInput,
	encodeImage,
	resizeImage,
	cropImage,
	compositeImage,
	adjustImage,
	removeBackgroundImage,
	upscaleImage,
	tracePng,
};

Comlink.expose(api);
