export type AsciiPreset = "classic" | "matrix" | "blueprint" | "paper";
export type AsciiCharset = "classic" | "detailed" | "blocks";

export const ASCII_RAMPS: Record<AsciiCharset, string> = {
	classic: " .:-=+*#%@",
	detailed:
		'$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'. ',
	blocks: " ░▒▓█",
};

export const ASCII_PRESETS: Record<
	AsciiPreset,
	{ background: string; foreground: string }
> = {
	classic: { background: "#0a0e14", foreground: "#f1f5f9" },
	matrix: { background: "#02120a", foreground: "#2ed573" },
	blueprint: { background: "#071a3a", foreground: "#9eb8ff" },
	paper: { background: "#f8fafc", foreground: "#0f172a" },
};

// luminance with a simple contrast curve. 0 is untouched, 100 doubles
// the distance from mid grey, -100 flattens toward grey.
export function asciiLuminance(red: number, green: number, blue: number): number {
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function applyContrast(value: number, contrast: number): number {
	const factor = Math.max(0, 1 + contrast / 100);
	return Math.max(0, Math.min(255, (value - 127.5) * factor + 127.5));
}

export interface AsciiCell {
	char: string;
	color: string;
}

export interface AsciiResult {
	rows: number;
	cols: number;
	lines: AsciiCell[][];
}

function hex2(value: number): string {
	return Math.max(0, Math.min(255, Math.round(value)))
		.toString(16)
		.padStart(2, "0");
}

function rgb(red: number, green: number, blue: number): string {
	return `#${hex2(red)}${hex2(green)}${hex2(blue)}`;
}

// tints source pixels for the two phosphor-style presets, otherwise keeps
// the photo colors when color mode is on.
export function asciiColor(
	red: number,
	green: number,
	blue: number,
	preset: AsciiPreset,
	color: boolean,
): string {
	if (!color) {
		return ASCII_PRESETS[preset].foreground;
	}
	const lum = asciiLuminance(red, green, blue);
	if (preset === "matrix") {
		return rgb(40 + lum * 0.35, 120 + lum * 0.53, 70 + lum * 0.3);
	}
	if (preset === "blueprint") {
		return rgb(80 + lum * 0.45, 120 + lum * 0.45, 200 + lum * 0.22);
	}
	return rgb(red, green, blue);
}

export function imageToAscii(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	options: {
		charset: AsciiCharset;
		contrast: number;
		preset: AsciiPreset;
		color: boolean;
	},
): AsciiResult {
	if (width <= 0 || height <= 0) {
		return { rows: 0, cols: 0, lines: [] };
	}
	const ramp = ASCII_RAMPS[options.charset];
	const lines: AsciiCell[][] = [];
	for (let y = 0; y < height; y += 1) {
		const line: AsciiCell[] = [];
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			const alpha = data[offset + 3] ?? 255;
			if (alpha < 16) {
				line.push({ char: " ", color: "transparent" });
				continue;
			}
			const red = data[offset] ?? 0;
			const green = data[offset + 1] ?? 0;
			const blue = data[offset + 2] ?? 0;
			const lum = applyContrast(asciiLuminance(red, green, blue), options.contrast);
			const index = Math.min(
				ramp.length - 1,
				Math.max(0, Math.round(((255 - lum) / 255) * (ramp.length - 1))),
			);
			line.push({
				char: ramp[index] ?? " ",
				color: asciiColor(red, green, blue, options.preset, options.color),
			});
		}
		lines.push(line);
	}
	return { rows: height, cols: width, lines };
}

export function asciiText(result: AsciiResult): string {
	return result.lines.map((line) => line.map((cell) => cell.char).join("")).join("\n");
}