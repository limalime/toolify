import { describe, expect, it } from "vitest";
import {
	applyContrast,
	ASCII_RAMPS,
	asciiColor,
	asciiText,
	imageToAscii,
} from "./ascii-image";

function pixels(colors: Array<[number, number, number, number]>): Uint8ClampedArray {
	return new Uint8ClampedArray(colors.flat());
}

describe("image to ascii", () => {
	it("uses dense characters for dark pixels and spaces for transparent", () => {
		const data = pixels([
			[0, 0, 0, 255],
			[255, 255, 255, 255],
			[0, 0, 0, 0],
			[128, 128, 128, 255],
		]);
		const result = imageToAscii(data, 2, 2, {
			charset: "classic",
			contrast: 0,
			preset: "classic",
			color: false,
		});
		expect(result.lines[0]?.[0]?.char).toBe("@");
		expect(result.lines[0]?.[1]?.char).toBe(" ");
		expect(result.lines[1]?.[0]?.char).toBe(" ");
		expect(result.lines[1]?.[1]?.char).toBe("=");
		expect(result.lines[0]?.[0]?.color).toBe("#f1f5f9");
	});

	it("maps the full ramp", () => {
		expect(ASCII_RAMPS.classic[0]).toBe(" ");
		expect(ASCII_RAMPS.classic.at(-1)).toBe("@");
		expect(ASCII_RAMPS.blocks.at(-1)).toBe("█");
	});

	it("increases separation with positive contrast", () => {
		expect(applyContrast(160, 0)).toBe(160);
		expect(applyContrast(160, 100)).toBeGreaterThan(160);
		expect(applyContrast(60, 100)).toBeLessThan(60);
	});

	it("tints matrix output green and keeps photo colors when asked", () => {
		expect(asciiColor(255, 0, 0, "matrix", true)).toMatch(/^#[0-9a-f]{6}$/);
		expect(asciiColor(200, 100, 50, "classic", true)).toBe("#c86432");
		expect(asciiColor(200, 100, 50, "classic", false)).toBe("#f1f5f9");
	});

	it("turns a result back into plain text", () => {
		const data = pixels([
			[0, 0, 0, 255],
			[255, 255, 255, 255],
		]);
		const result = imageToAscii(data, 2, 1, {
			charset: "classic",
			contrast: 0,
			preset: "classic",
			color: false,
		});
		expect(asciiText(result)).toBe("@ ");
	});
});