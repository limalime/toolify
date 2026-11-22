export type Harmony = "analogous" | "complementary" | "triadic";

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

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizeHex(input: string): string | null {
	const match = HEX.exec(input.trim());
	if (!match) {
		return null;
	}
	let body = (match[1] as string).toLowerCase();
	if (body.length === 3) {
		body = body
			.split("")
			.map((digit) => `${digit}${digit}`)
			.join("");
	}
	return `#${body}`;
}

export function hexToRgb(hex: string): Rgb {
	const normalized = normalizeHex(hex);
	if (!normalized) {
		throw new Error(`invalid hex colour: ${hex}`);
	}
	return {
		r: Number.parseInt(normalized.slice(1, 3), 16),
		g: Number.parseInt(normalized.slice(3, 5), 16),
		b: Number.parseInt(normalized.slice(5, 7), 16),
	};
}

const clampChannel = (value: number) =>
	Math.min(255, Math.max(0, Math.round(value)));

export function rgbToHex({ r, g, b }: Rgb): string {
	const channel = (value: number) =>
		clampChannel(value).toString(16).padStart(2, "0");
	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
	const red = r / 255;
	const green = g / 255;
	const blue = b / 255;
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const delta = max - min;
	const l = (max + min) / 2;

	if (delta === 0) {
		return { h: 0, s: 0, l: l * 100 };
	}

	const s = delta / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === red) {
		h = ((green - blue) / delta) % 6;
	} else if (max === green) {
		h = (blue - red) / delta + 2;
	} else {
		h = (red - green) / delta + 4;
	}
	h *= 60;
	if (h < 0) {
		h += 360;
	}
	return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
	const hue = ((h % 360) + 360) % 360;
	const sat = Math.min(100, Math.max(0, s)) / 100;
	const light = Math.min(100, Math.max(0, l)) / 100;
	const c = (1 - Math.abs(2 * light - 1)) * sat;
	const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
	const m = light - c / 2;

	let red = 0;
	let green = 0;
	let blue = 0;
	if (hue < 60) {
		red = c;
		green = x;
	} else if (hue < 120) {
		red = x;
		green = c;
	} else if (hue < 180) {
		green = c;
		blue = x;
	} else if (hue < 240) {
		green = x;
		blue = c;
	} else if (hue < 300) {
		red = x;
		blue = c;
	} else {
		red = c;
		blue = x;
	}

	return {
		r: clampChannel((red + m) * 255),
		g: clampChannel((green + m) * 255),
		b: clampChannel((blue + m) * 255),
	};
}

export function rotateHue(hex: string, degrees: number): string {
	const base = normalizeHex(hex);
	if (!base) {
		throw new Error(`invalid hex colour: ${hex}`);
	}
	if (degrees % 360 === 0) {
		return base;
	}
	const hsl = rgbToHsl(hexToRgb(base));
	return rgbToHex(hslToRgb({ ...hsl, h: hsl.h + degrees }));
}

const OFFSETS: Record<Harmony, number[]> = {
	analogous: [-60, -30, 0, 30, 60],
	complementary: [0, 180],
	triadic: [0, 120, 240],
};

export function buildPalette(hex: string, harmony: Harmony): string[] {
	const base = normalizeHex(hex);
	if (!base) {
		throw new Error(`invalid hex colour: ${hex}`);
	}
	return OFFSETS[harmony].map((offset) => rotateHue(base, offset));
}

function luminance(hex: string): number {
	const { r, g, b } = hexToRgb(hex);
	const channel = (value: number) => {
		const scaled = value / 255;
		return scaled <= 0.03928
			? scaled / 12.92
			: ((scaled + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

const LIGHT_INK = "#ffffff";
const DARK_INK = "#0a0e14";

export function readableInk(hex: string): string {
	const value = luminance(hex);
	const onWhite = 1.05 / (value + 0.05);
	const onDark = (value + 0.05) / (luminance(DARK_INK) + 0.05);
	return onWhite >= onDark ? LIGHT_INK : DARK_INK;
}

export function paletteToCss(colors: string[], name?: string): string {
	const lines: string[] = [];
	if (name) {
		lines.push(`/* ${name} */`);
	}
	lines.push(":root {");
	for (const [index, color] of colors.entries()) {
		lines.push(`  --palette-${index + 1}: ${color};`);
	}
	lines.push("}");
	return `${lines.join("\n")}\n`;
}

export function paletteToJson(payload: {
	base: string;
	harmony: Harmony;
	colors: string[];
}): string {
	return JSON.stringify(payload, null, 2);
}
