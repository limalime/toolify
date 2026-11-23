export interface Rgb {
	r: number;
	g: number;
	b: number;
}

export interface Hsl {
	h: number;
	s: number;
	l: number;
}

export function clampByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToHex({ r, g, b }: Rgb): string {
	const hex = (value: number) => clampByte(value).toString(16).padStart(2, "0");
	return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!match?.[1]) {
		return null;
	}
	const value =
		match[1].length === 3
			? match[1]
					.split("")
					.map((char) => `${char}${char}`)
					.join("")
			: match[1];
	return {
		r: Number.parseInt(value.slice(0, 2), 16),
		g: Number.parseInt(value.slice(2, 4), 16),
		b: Number.parseInt(value.slice(4, 6), 16),
	};
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const red = clampByte(r) / 255;
	const green = clampByte(g) / 255;
	const blue = clampByte(b) / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const lightness = (max + min) / 2;
	if (max === min) {
		return { h: 0, s: 0, l: Math.round(lightness * 100) };
	}
	const delta = max - min;
	const saturation =
		lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue = 0;
	if (max === red) {
		hue = (green - blue) / delta + (green < blue ? 6 : 0);
	} else if (max === green) {
		hue = (blue - red) / delta + 2;
	} else {
		hue = (red - green) / delta + 4;
	}
	return {
		h: Math.round(hue * 60),
		s: Math.round(saturation * 100),
		l: Math.round(lightness * 100),
	};
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const saturation = s / 100;
	const lightness = l / 100;
	const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
	const sector = ((h % 360) + 360) % 360 / 60;
	const second = chroma * (1 - Math.abs((sector % 2) - 1));
	const match = lightness - chroma / 2;
	let red = 0;
	let green = 0;
	let blue = 0;
	if (sector < 1) {
		red = chroma;
		green = second;
	} else if (sector < 2) {
		red = second;
		green = chroma;
	} else if (sector < 3) {
		green = chroma;
		blue = second;
	} else if (sector < 4) {
		green = second;
		blue = chroma;
	} else if (sector < 5) {
		red = second;
		blue = chroma;
	} else {
		red = chroma;
		blue = second;
	}
	return {
		r: clampByte((red + match) * 255),
		g: clampByte((green + match) * 255),
		b: clampByte((blue + match) * 255),
	};
}

export interface AverageColor extends Rgb {
	hex: string;
	pixels: number;
	transparent: number;
}

// averages visible pixels only. fully transparent rows contribute nothing
// so a cutout png reports its subject color, not black.
export function averageColor(
	data: Uint8ClampedArray,
	alphaThreshold = 8,
): AverageColor {
	let red = 0;
	let green = 0;
	let blue = 0;
	let pixels = 0;
	let transparent = 0;
	for (let index = 0; index + 3 < data.length; index += 4) {
		const alpha = data[index + 3] ?? 0;
		if (alpha < alphaThreshold) {
			transparent += 1;
			continue;
		}
		red += (data[index] ?? 0) * alpha;
		green += (data[index + 1] ?? 0) * alpha;
		blue += (data[index + 2] ?? 0) * alpha;
		pixels += alpha;
	}
	if (pixels === 0) {
		return { r: 0, g: 0, b: 0, hex: "#000000", pixels: 0, transparent };
	}
	const rgb = {
		r: clampByte(red / pixels),
		g: clampByte(green / pixels),
		b: clampByte(blue / pixels),
	};
	return { ...rgb, hex: rgbToHex(rgb), pixels, transparent };
}

export interface DominantColor extends Rgb {
	hex: string;
	pixels: number;
}

// buckets colors into a 4 bit per channel grid and returns the busiest
// buckets, so the palette shows what the image is mostly made of.
export function dominantColors(
	data: Uint8ClampedArray,
	limit = 6,
	alphaThreshold = 8,
): DominantColor[] {
	const buckets = new Map<
		number,
		{ r: number; g: number; b: number; pixels: number }
	>();
	for (let index = 0; index + 3 < data.length; index += 4) {
		const alpha = data[index + 3] ?? 0;
		if (alpha < alphaThreshold) {
			continue;
		}
		const red = data[index] ?? 0;
		const green = data[index + 1] ?? 0;
		const blue = data[index + 2] ?? 0;
		const key = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
		const bucket = buckets.get(key);
		if (bucket) {
			bucket.r += red;
			bucket.g += green;
			bucket.b += blue;
			bucket.pixels += 1;
		} else {
			buckets.set(key, { r: red, g: green, b: blue, pixels: 1 });
		}
	}
	return [...buckets.values()]
		.sort((left, right) => right.pixels - left.pixels)
		.slice(0, Math.max(0, limit))
		.map((bucket) => {
			const rgb = {
				r: clampByte(bucket.r / bucket.pixels),
				g: clampByte(bucket.g / bucket.pixels),
				b: clampByte(bucket.b / bucket.pixels),
			};
			return { ...rgb, hex: rgbToHex(rgb), pixels: bucket.pixels };
		});
}

export function pickColor(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	x: number,
	y: number,
): Rgb & { hex: string; alpha: number } {
	const px = Math.max(0, Math.min(width - 1, Math.floor(x)));
	const py = Math.max(0, Math.min(height - 1, Math.floor(y)));
	const offset = (py * width + px) * 4;
	const rgba = {
		r: data[offset] ?? 0,
		g: data[offset + 1] ?? 0,
		b: data[offset + 2] ?? 0,
	};
	return {
		...rgba,
		hex: rgbToHex(rgba),
		alpha: data[offset + 3] ?? 255,
	};
}

export function readableInk({ r, g, b }: Rgb): string {
	const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	return luminance > 0.58 ? "#0a0e14" : "#ffffff";
}

export function cssRgb({ r, g, b }: Rgb): string {
	return `rgb(${clampByte(r)} ${clampByte(g)} ${clampByte(b)})`;
}

export function cssHsl({ h, s, l }: Hsl): string {
	return `hsl(${h} ${s}% ${l}%)`;
}