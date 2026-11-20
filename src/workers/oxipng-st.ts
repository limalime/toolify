// single-threaded oxipng. the package root conditionally pulls pkg-parallel
// (wasm-bindgen-rayon workers nested inside our worker), which hangs the
// turbopack production build, so this mirrors its initST path directly.
import { defaultOptions, type OptimiseOptions } from "@jsquash/oxipng/meta.js";

type Wasm = typeof import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");

let ready: Promise<Pick<Wasm, "optimise" | "optimise_raw">> | null = null;

async function init(): Promise<Pick<Wasm, "optimise" | "optimise_raw">> {
	if (!ready) {
		ready = (async () => {
			const {
				default: initWasm,
				optimise,
				optimise_raw,
			} = await import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");
			await initWasm();
			return { optimise, optimise_raw };
		})();
	}
	return ready;
}

export async function optimise(
	data: ArrayBuffer | ImageData,
	options: Partial<OptimiseOptions> = {},
): Promise<ArrayBuffer> {
	const merged = { ...defaultOptions, ...options };
	const wasm = await init();
	const out =
		data instanceof ImageData
			? wasm.optimise_raw(
					data.data,
					data.width,
					data.height,
					merged.level,
					merged.interlace,
					merged.optimiseAlpha,
				)
			: wasm.optimise(
					new Uint8Array(data),
					merged.level,
					merged.interlace,
					merged.optimiseAlpha,
				);
	return out.buffer as ArrayBuffer;
}
