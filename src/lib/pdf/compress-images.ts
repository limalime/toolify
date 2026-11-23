import { inflateSync, unzlibSync } from "fflate";
import {
	PDFArray,
	PDFBool,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFNumber,
	PDFRawStream,
	PDFRef,
	PDFString,
} from "pdf-lib";
import { PDF_DPI_CAP, PDF_QUALITY_JPEG, type PdfQuality } from "./compress";

// keep the long edge within what a browser canvas can hold at a sane memory cost
const MAX_IMAGE_EDGE = 4096;
const MAX_SOURCE_PIXELS = 40_000_000;

export interface ImageCodec {
	transcodeJpeg: (
		bytes: Uint8Array,
		width: number,
		height: number,
		quality: number,
	) => Promise<Uint8Array | null>;
	encodeRgba: (
		rgba: Uint8Array,
		width: number,
		height: number,
		targetWidth: number,
		targetHeight: number,
		quality: number,
	) => Promise<Uint8Array | null>;
}

export interface CompressOptions {
	quality: PdfQuality;
	codec: ImageCodec;
	onProgress?: (done: number, total: number) => void;
}

export interface CompressSummary {
	bytes: Uint8Array;
	pages: number;
	images: number;
	replaced: number;
}

type ColorKind = "gray" | "rgb" | "cmyk" | "indexed";

interface ColorSpec {
	kind: ColorKind;
	components: 1 | 3 | 4;
	palette?: Uint8Array;
}

export interface PredictorParams {
	predictor: number;
	colors: number;
	columns: number;
	bitsPerComponent: number;
	height: number;
}

interface FlateInfo {
	width: number;
	height: number;
	color: ColorSpec;
	predictor: PredictorParams;
}

interface ImageJob {
	ref: PDFRef;
	stream: PDFRawStream;
	filter: "DCTDecode" | "FlateDecode";
	width: number;
	height: number;
	flate: FlateInfo | null;
}

function nameOf(value: unknown): string | null {
	if (value instanceof PDFName) {
		return value.asString().replace(/^\//, "");
	}
	return null;
}

function numberValue(value: unknown): number | null {
	return value instanceof PDFNumber ? value.asNumber() : null;
}

function isTrue(value: unknown): boolean {
	return value instanceof PDFBool && value.asBoolean();
}

function filtersOf(dict: PDFDict): string[] | null {
	const value = dict.lookup(PDFName.of("Filter"));
	if (!value) {
		return [];
	}
	if (value instanceof PDFName) {
		const name = nameOf(value);
		return name ? [name] : null;
	}
	if (value instanceof PDFArray) {
		const names: string[] = [];
		for (let index = 0; index < value.size(); index += 1) {
			const name = nameOf(value.lookup(index));
			if (!name) {
				return null;
			}
			names.push(name);
		}
		return names;
	}
	return null;
}

// colour lookup tables are usually written raw, but the spec allows a flate
// compressed stream. anything else is not worth guessing at.
function lookupBytes(value: unknown): Uint8Array | null {
	if (value instanceof PDFRawStream) {
		const filters = filtersOf(value.dict);
		if (!filters) {
			return null;
		}
		if (filters.length === 0) {
			return value.contents;
		}
		if (filters.length === 1 && filters[0] === "FlateDecode") {
			return inflate(value.contents);
		}
		return null;
	}
	if (value instanceof PDFString || value instanceof PDFHexString) {
		return value.asBytes();
	}
	return null;
}

function namedColor(name: string): ColorSpec | null {
	if (name === "DeviceGray" || name === "CalGray") {
		return { kind: "gray", components: 1 };
	}
	if (name === "DeviceRGB" || name === "CalRGB") {
		return { kind: "rgb", components: 3 };
	}
	if (name === "DeviceCMYK") {
		return { kind: "cmyk", components: 4 };
	}
	return null;
}

function paletteToRgb(bytes: Uint8Array, base: ColorSpec): Uint8Array | null {
	if (base.kind === "rgb") {
		return bytes;
	}
	const count = Math.floor(bytes.length / base.components);
	const rgb = new Uint8Array(count * 3);
	for (let index = 0; index < count; index += 1) {
		const offset = index * base.components;
		if (base.kind === "gray") {
			rgb[index * 3] = bytes[offset] ?? 0;
			rgb[index * 3 + 1] = bytes[offset] ?? 0;
			rgb[index * 3 + 2] = bytes[offset] ?? 0;
		} else if (base.kind === "cmyk") {
			const c = (bytes[offset] ?? 0) / 255;
			const m = (bytes[offset + 1] ?? 0) / 255;
			const y = (bytes[offset + 2] ?? 0) / 255;
			const k = (bytes[offset + 3] ?? 0) / 255;
			rgb[index * 3] = Math.round(255 * (1 - c) * (1 - k));
			rgb[index * 3 + 1] = Math.round(255 * (1 - m) * (1 - k));
			rgb[index * 3 + 2] = Math.round(255 * (1 - y) * (1 - k));
		}
	}
	return rgb;
}

function resolveColorSpace(value: unknown): ColorSpec | null {
	if (value instanceof PDFName) {
		return namedColor(nameOf(value) ?? "");
	}
	if (!(value instanceof PDFArray)) {
		return null;
	}
	const head = nameOf(value.lookup(0));
	if (!head) {
		return null;
	}
	if (head === "ICCBased") {
		const profile = value.lookup(1);
		if (!(profile instanceof PDFRawStream)) {
			return null;
		}
		const components = numberValue(profile.dict.lookup(PDFName.of("N")));
		if (components === 1) {
			return { kind: "gray", components: 1 };
		}
		if (components === 3) {
			return { kind: "rgb", components: 3 };
		}
		if (components === 4) {
			return { kind: "cmyk", components: 4 };
		}
		return null;
	}
	if (head === "CalGray") {
		return { kind: "gray", components: 1 };
	}
	if (head === "CalRGB") {
		return { kind: "rgb", components: 3 };
	}
	if (head === "Indexed") {
		const base = resolveColorSpace(value.lookup(1));
		if (!base || base.kind === "indexed") {
			return null;
		}
		const high = numberValue(value.lookup(2));
		const lookup = lookupBytes(value.lookup(3));
		if (high === null || high < 0 || !lookup) {
			return null;
		}
		const needed = (high + 1) * base.components;
		if (lookup.length < needed) {
			return null;
		}
		const palette = paletteToRgb(lookup.slice(0, needed), base);
		return palette ? { kind: "indexed", components: 1, palette } : null;
	}
	return null;
}

function decodeParams(
	dict: PDFDict,
	color: ColorSpec,
	width: number,
): PredictorParams | null {
	const stored = dict.lookup(PDFName.of("DecodeParms"));
	if (!stored) {
		return {
			predictor: 1,
			colors: color.components,
			columns: width,
			bitsPerComponent: 8,
			height: 0,
		};
	}
	const params = stored instanceof PDFArray ? stored.lookup(0) : stored;
	if (!(params instanceof PDFDict)) {
		return null;
	}
	const predictor = numberValue(params.lookup(PDFName.of("Predictor"))) ?? 1;
	const colors =
		numberValue(params.lookup(PDFName.of("Colors"))) ?? color.components;
	const columns = numberValue(params.lookup(PDFName.of("Columns"))) ?? width;
	const bitsPerComponent =
		numberValue(params.lookup(PDFName.of("BitsPerComponent"))) ?? 8;
	if (predictor !== 1 && predictor !== 2 && predictor < 10) {
		return null;
	}
	if (bitsPerComponent !== 8 || colors <= 0 || columns <= 0) {
		return null;
	}
	return {
		predictor,
		colors,
		columns,
		bitsPerComponent,
		height: 0,
	};
}

function readFlateInfo(dict: PDFDict): FlateInfo | null {
	const width = numberValue(dict.lookup(PDFName.of("Width")));
	const height = numberValue(dict.lookup(PDFName.of("Height")));
	const bits = numberValue(dict.lookup(PDFName.of("BitsPerComponent"))) ?? 8;
	if (!width || !height || width < 1 || height < 1 || bits !== 8) {
		return null;
	}
	const color = resolveColorSpace(dict.lookup(PDFName.of("ColorSpace")));
	if (!color) {
		return null;
	}
	const predictor = decodeParams(dict, color, width);
	if (!predictor) {
		return null;
	}
	return { width, height, color, predictor };
}

export function targetPixels(
	width: number,
	height: number,
	dpi: number,
	pageWidth: number,
): { width: number; height: number } {
	const byDpi = Math.max(1, Math.round((pageWidth / 72) * dpi));
	const capWidth = Math.min(MAX_IMAGE_EDGE, byDpi);
	const scale = Math.min(1, capWidth / width, MAX_IMAGE_EDGE / height);
	if (!Number.isFinite(scale) || scale >= 1) {
		return {
			width: Math.max(1, Math.round(width)),
			height: Math.max(1, Math.round(height)),
		};
	}
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

export function undoPredictor(
	data: Uint8Array,
	params: PredictorParams,
): Uint8Array | null {
	const rowBytes = params.columns * params.colors;
	const total = rowBytes * params.height;
	if (rowBytes <= 0 || params.height <= 0) {
		return null;
	}
	if (params.predictor === 1) {
		return data.length >= total ? data.slice(0, total) : null;
	}
	if (params.predictor === 2) {
		if (data.length < total) {
			return null;
		}
		const output = data.slice(0, total);
		for (let row = 0; row < params.height; row += 1) {
			const start = row * rowBytes;
			for (let index = params.colors; index < rowBytes; index += 1) {
				output[start + index] =
					(output[start + index] + output[start + index - params.colors]) &
					0xff;
			}
		}
		return output;
	}
	const stride = rowBytes + 1;
	if (data.length < stride * params.height) {
		return null;
	}
	const output = new Uint8Array(total);
	let previous = new Uint8Array(rowBytes);
	for (let row = 0; row < params.height; row += 1) {
		const filter = data[row * stride];
		const source = row * stride + 1;
		const start = row * rowBytes;
		for (let index = 0; index < rowBytes; index += 1) {
			const raw = data[source + index];
			const left =
				index >= params.colors ? output[start + index - params.colors] : 0;
			const up = previous[index] ?? 0;
			const upLeft =
				index >= params.colors ? (previous[index - params.colors] ?? 0) : 0;
			let value = raw;
			if (filter === 1) {
				value = raw + left;
			} else if (filter === 2) {
				value = raw + up;
			} else if (filter === 3) {
				value = raw + Math.floor((left + up) / 2);
			} else if (filter === 4) {
				const p = left + up - upLeft;
				const pa = Math.abs(p - left);
				const pb = Math.abs(p - up);
				const pc = Math.abs(p - upLeft);
				const nearest = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
				value = raw + nearest;
			}
			output[start + index] = value & 0xff;
		}
		previous = output.subarray(start, start + rowBytes);
	}
	return output;
}

export function expandToRgba(
	raw: Uint8Array,
	width: number,
	height: number,
	components: number,
	palette?: Uint8Array,
): Uint8Array | null {
	const expected = width * height * components;
	if (width < 1 || height < 1 || raw.length < expected) {
		return null;
	}
	const rgba = new Uint8Array(width * height * 4);
	for (let pixel = 0; pixel < width * height; pixel += 1) {
		const source = pixel * components;
		const target = pixel * 4;
		if (palette) {
			const entry = (raw[source] ?? 0) * 3;
			rgba[target] = palette[entry] ?? 0;
			rgba[target + 1] = palette[entry + 1] ?? 0;
			rgba[target + 2] = palette[entry + 2] ?? 0;
		} else if (components === 1) {
			const value = raw[source] ?? 0;
			rgba[target] = value;
			rgba[target + 1] = value;
			rgba[target + 2] = value;
		} else if (components === 3) {
			rgba[target] = raw[source] ?? 0;
			rgba[target + 1] = raw[source + 1] ?? 0;
			rgba[target + 2] = raw[source + 2] ?? 0;
		} else {
			const c = (raw[source] ?? 0) / 255;
			const m = (raw[source + 1] ?? 0) / 255;
			const y = (raw[source + 2] ?? 0) / 255;
			const k = (raw[source + 3] ?? 0) / 255;
			rgba[target] = Math.round(255 * (1 - c) * (1 - k));
			rgba[target + 1] = Math.round(255 * (1 - m) * (1 - k));
			rgba[target + 2] = Math.round(255 * (1 - y) * (1 - k));
		}
		rgba[target + 3] = 255;
	}
	return rgba;
}

// a content image is anything painted on a page. stencil masks and the soft
// mask streams themselves are not counted, the cover image that owns them is.
function countsAsImage(
	ref: PDFRef,
	stream: PDFRawStream,
	smaskRefs: Set<string>,
): boolean {
	const dict = stream.dict;
	if (nameOf(dict.lookup(PDFName.of("Subtype"))) !== "Image") {
		return false;
	}
	if (isTrue(dict.lookup(PDFName.of("ImageMask")))) {
		return false;
	}
	return !smaskRefs.has(ref.toString());
}

function inspectImage(
	ref: PDFRef,
	stream: PDFRawStream,
	smaskRefs: Set<string>,
): ImageJob | null {
	const dict = stream.dict;
	if (
		!countsAsImage(ref, stream, smaskRefs) ||
		dict.has(PDFName.of("Decode")) ||
		dict.has(PDFName.of("Mask")) ||
		dict.has(PDFName.of("SMask"))
	) {
		return null;
	}
	const width = numberValue(dict.lookup(PDFName.of("Width")));
	const height = numberValue(dict.lookup(PDFName.of("Height")));
	const bits = numberValue(dict.lookup(PDFName.of("BitsPerComponent"))) ?? 8;
	if (
		!width ||
		!height ||
		width < 1 ||
		height < 1 ||
		bits !== 8 ||
		width * height > MAX_SOURCE_PIXELS
	) {
		return null;
	}
	const filters = filtersOf(dict);
	if (filters?.length !== 1) {
		return null;
	}
	const filter = filters[0];
	if (filter !== "DCTDecode" && filter !== "FlateDecode") {
		return null;
	}
	const flate = filter === "FlateDecode" ? readFlateInfo(dict) : null;
	if (filter === "FlateDecode" && !flate) {
		return null;
	}
	return { ref, stream, filter, width, height, flate };
}

function inflate(bytes: Uint8Array): Uint8Array | null {
	try {
		return unzlibSync(bytes);
	} catch {
		try {
			return inflateSync(bytes);
		} catch {
			return null;
		}
	}
}

function decodeFlate(stream: PDFRawStream, info: FlateInfo): Uint8Array | null {
	const inflated = inflate(stream.contents);
	if (!inflated) {
		return null;
	}
	const predictor = { ...info.predictor, height: info.height };
	const raw = undoPredictor(inflated, predictor);
	if (!raw) {
		return null;
	}
	return expandToRgba(
		raw,
		info.width,
		info.height,
		info.color.components,
		info.color.palette,
	);
}

export async function compressPdfImages(
	bytes: Uint8Array,
	options: CompressOptions,
): Promise<CompressSummary> {
	const document = await PDFDocument.load(bytes);
	const entries = document.context.enumerateIndirectObjects();
	const smaskRefs = new Set<string>();
	for (const [, object] of entries) {
		if (!(object instanceof PDFRawStream)) {
			continue;
		}
		const mask = object.dict.get(PDFName.of("SMask"));
		if (mask instanceof PDFRef) {
			smaskRefs.add(mask.toString());
		}
	}
	const jobs: ImageJob[] = [];
	let images = 0;
	for (const [ref, object] of entries) {
		if (!(object instanceof PDFRawStream)) {
			continue;
		}
		if (!countsAsImage(ref, object, smaskRefs)) {
			continue;
		}
		images += 1;
		const job = inspectImage(ref, object, smaskRefs);
		if (job) {
			jobs.push(job);
		}
	}
	options.onProgress?.(0, jobs.length);
	const jpegQuality = PDF_QUALITY_JPEG[options.quality] ?? 0.72;
	const dpi = PDF_DPI_CAP[options.quality] ?? 120;
	const pageWidth = Math.max(
		1,
		...document.getPages().map((page) => page.getWidth()),
	);
	let replaced = 0;
	for (let index = 0; index < jobs.length; index += 1) {
		const job = jobs[index];
		try {
			const target = targetPixels(job.width, job.height, dpi, pageWidth);
			let jpeg: Uint8Array | null = null;
			if (job.filter === "DCTDecode") {
				jpeg = await options.codec.transcodeJpeg(
					job.stream.contents,
					target.width,
					target.height,
					jpegQuality,
				);
			} else if (job.flate) {
				const rgba = decodeFlate(job.stream, job.flate);
				if (rgba) {
					jpeg = await options.codec.encodeRgba(
						rgba,
						job.width,
						job.height,
						target.width,
						target.height,
						jpegQuality,
					);
				}
			}
			if (jpeg && jpeg.length > 0 && jpeg.length < job.stream.contents.length) {
				const dict = job.stream.dict;
				dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
				dict.delete(PDFName.of("DecodeParms"));
				dict.delete(PDFName.of("Decode"));
				dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
				dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
				dict.set(PDFName.of("Width"), PDFNumber.of(target.width));
				dict.set(PDFName.of("Height"), PDFNumber.of(target.height));
				// keep the same object number so every xobject reference still points here
				document.context.assign(job.ref, PDFRawStream.of(dict, jpeg));
				replaced += 1;
			}
		} catch (unknown) {
			console.warn("pdf image skipped", job.ref.toString(), unknown);
		}
		options.onProgress?.(index + 1, jobs.length);
	}
	const pages = document.getPageCount();
	if (replaced === 0) {
		return { bytes, pages, images, replaced };
	}
	let saved: Uint8Array;
	try {
		saved = await document.save();
	} catch (unknown) {
		console.warn("pdf save failed, returning the original", unknown);
		return { bytes, pages, images, replaced: 0 };
	}
	// a full rewrite can add bytes even when images shrank. never hand back a
	// larger file.
	if (saved.length >= bytes.length) {
		return { bytes, pages, images, replaced: 0 };
	}
	return { bytes: saved, pages, images, replaced };
}
