// non-ai enhance math. brightness, contrast and saturation compose into
// one per-pixel pass, sharpness runs as a second 3x3 pass. sliders feed
// -100 to 100 (sharpness 0 to 100), 0 always means untouched.

export interface EnhanceOptions {
	brightness: number;
	contrast: number;
	saturation: number;
	sharpness: number;
}

export const NEUTRAL_ENHANCE: EnhanceOptions = {
	brightness: 0,
	contrast: 0,
	saturation: 0,
	sharpness: 0,
};

export function clampByte(value: number): number {
	return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

function lumaOf(red: number, green: number, blue: number): number {
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastFactor(amount: number): number {
	const scaled = (Math.max(-100, Math.min(100, amount)) / 100) * 255;
	return (259 * (scaled + 255)) / (255 * (259 - scaled));
}

export function adjustPixel(
	red: number,
	green: number,
	blue: number,
	options: EnhanceOptions,
): [number, number, number] {
	const shifted: [number, number, number] = [
		red + (options.brightness / 100) * 255,
		green + (options.brightness / 100) * 255,
		blue + (options.brightness / 100) * 255,
	];
	const factor = contrastFactor(options.contrast);
	const contrasted = shifted.map((value) => factor * (value - 128) + 128) as [
		number,
		number,
		number,
	];
	const gray = lumaOf(contrasted[0], contrasted[1], contrasted[2]);
	const mix = 1 + options.saturation / 100;
	return [
		clampByte(gray + (contrasted[0] - gray) * mix),
		clampByte(gray + (contrasted[1] - gray) * mix),
		clampByte(gray + (contrasted[2] - gray) * mix),
	];
}

// single 3x3 blur-minus-original pass, edges sample the nearest pixel.
export function sharpenPlane(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	amount: number,
): Uint8ClampedArray {
	const strength = Math.max(0, Math.min(100, amount)) / 100;
	if (strength === 0) {
		return data;
	}
	const out = new Uint8ClampedArray(data);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			for (let channel = 0; channel < 3; channel++) {
				let sum = 0;
				for (let ky = -1; ky <= 1; ky++) {
					const sy = Math.max(0, Math.min(height - 1, y + ky));
					for (let kx = -1; kx <= 1; kx++) {
						const sx = Math.max(0, Math.min(width - 1, x + kx));
						sum += data[(sy * width + sx) * 4 + channel] as number;
					}
				}
				const index = (y * width + x) * 4 + channel;
				const center = data[index] as number;
				out[index] = center + (center - sum / 9) * strength;
			}
		}
	}
	return out;
}
