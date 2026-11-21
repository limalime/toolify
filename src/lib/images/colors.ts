// photo-vs-graphics sniffing for the tracer. counts distinct colors on
// a coarse sample, quantized to 6 bits so flat art stays tiny while
// gradients and photos count in the hundreds and up.
export function distinctColors(data: Uint8ClampedArray, cap: number): number {
	const seen = new Set<number>();
	const pixels = Math.floor(data.length / 4);
	const stride = Math.max(1, Math.floor(pixels / 10_000));
	for (let index = 0; index < pixels; index += stride) {
		const red = (data[index * 4] as number) >> 2;
		const green = (data[index * 4 + 1] as number) >> 2;
		const blue = (data[index * 4 + 2] as number) >> 2;
		seen.add((red << 16) | (green << 8) | blue);
		if (seen.size >= cap) {
			return seen.size;
		}
	}
	return seen.size;
}

export const PHOTO_COLOR_COUNT = 400;
