declare module "libheif-js/wasm-bundle" {
	export interface HeifImage {
		get_width(): number;
		get_height(): number;
		display(
			target: HeifTarget,
			callback: (data: HeifTarget | null) => void,
		): void;
	}

	export interface HeifTarget {
		data: Uint8ClampedArray<ArrayBufferLike>;
		width: number;
		height: number;
	}

	export class HeifDecoder {
		decode(bytes: Uint8Array): HeifImage[];
	}

	const libheif: { HeifDecoder: typeof HeifDecoder };
	export default libheif;
}
