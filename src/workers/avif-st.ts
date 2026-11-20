// single-threaded avif. the package root conditionally pulls avif_enc_mt.js
// (emscripten pthreads workers nested inside our worker), which hangs the
// turbopack production build, so this mirrors its single-thread path directly.

import type { AVIFModule } from "@jsquash/avif/codec/enc/avif_enc.js";
import {
	defaultOptions,
	type EncodeOptions,
	type ImageData16bit,
} from "@jsquash/avif/meta.js";
import { initEmscriptenModule } from "@jsquash/avif/utils.js";

let emscriptenModule: Promise<AVIFModule | null> | null = null;

async function ready(): Promise<AVIFModule | null> {
	if (!emscriptenModule) {
		emscriptenModule = (async () => {
			const factory = (await import("@jsquash/avif/codec/enc/avif_enc.js"))
				.default;
			return initEmscriptenModule(factory);
		})();
	}
	return emscriptenModule;
}

export default async function encode(
	data: ImageData,
	options?: Partial<EncodeOptions> & { bitDepth?: 8 },
): Promise<ArrayBuffer>;
export default async function encode(
	data: ImageData16bit,
	options: Partial<EncodeOptions> & { bitDepth: 10 | 12 },
): Promise<ArrayBuffer>;
export default async function encode(
	data: ImageData | ImageData16bit,
	options: Partial<EncodeOptions> = {},
): Promise<ArrayBuffer> {
	const pending = ready();
	const merged = { ...defaultOptions, ...options };
	if (
		merged.bitDepth !== 8 &&
		merged.bitDepth !== 10 &&
		merged.bitDepth !== 12
	) {
		throw new Error("Invalid bit depth. Supported values are 8, 10, or 12.");
	}
	if (!(data.data instanceof Uint16Array) && merged.bitDepth !== 8) {
		throw new Error(
			"Invalid image data for bit depth. Must use Uint16Array for bit depths greater than 8.",
		);
	}
	if (merged.lossless) {
		if (options.quality !== undefined && options.quality !== 100) {
			console.warn(
				"AVIF lossless: Quality setting is ignored when lossless is enabled (quality must be 100).",
			);
		}
		if (
			options.qualityAlpha !== undefined &&
			options.qualityAlpha !== 100 &&
			options.qualityAlpha !== -1
		) {
			console.warn(
				"AVIF lossless: QualityAlpha setting is ignored when lossless is enabled (qualityAlpha must be 100 or -1).",
			);
		}
		if (options.subsample !== undefined && options.subsample !== 3) {
			console.warn(
				"AVIF lossless: Subsample setting is ignored when lossless is enabled (subsample must be 3 for YUV444).",
			);
		}
		merged.quality = 100;
		merged.qualityAlpha = -1;
		merged.subsample = 3;
	}
	const module = await pending;
	if (!module) {
		throw new Error("Encoding error.");
	}
	const output = module.encode(
		new Uint8Array(data.data.buffer as ArrayBuffer),
		data.width,
		data.height,
		merged,
	);
	if (!output) {
		throw new Error("Encoding error.");
	}
	return output.buffer as ArrayBuffer;
}
