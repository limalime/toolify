import * as Comlink from "comlink";
import { buildIco, parseIco, pickPngEntry } from "@/lib/images/ico";
import { embedRasterSvg, ensureSvgSize, svgSize } from "@/lib/images/svg";

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

export const api = {
	decodeInput,
	encodeImage,
	resizeImage,
	cropImage,
	compositeImage,
};

Comlink.expose(api);
