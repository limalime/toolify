import { describe, expect, it } from "vitest";
import {
	averageColor,
	dominantColors,
	hexToRgb,
	rgbToHex,
	rgbToHsl,
	hslToRgb,
	pickColor,
	readableInk,
} from "./color";

describe("image color", () => {
	it("converts between hex and rgb", () => {
		expect(rgbToHex({ r: 27, g: 86, b: 253 })).toBe("#1b56fd");
		expect(rgbToHex({ r: 300, g: -2, b: 15.6 })).toBe("#ff0010");
		expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
		expect(hexToRgb("1b56fd")).toEqual({ r: 27, g: 86, b: 253 });
		expect(hexToRgb("#12")).toBeNull();
	});

	it("converts rgb to hsl and back", () => {
		const hsl = rgbToHsl({ r: 255, g: 0, b: 0 });
		expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
		expect(hslToRgb(hsl)).toEqual({ r: 255, g: 0, b: 0 });
		expect(rgbToHsl({ r: 120, g: 120, b: 120 })).toEqual({
			h: 0,
			s: 0,
			l: 47,
		});
	});

	it("averages visible pixels and skips transparent ones", () => {
		const data = new Uint8ClampedArray([
			255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 0, 0,
		]);
		const average = averageColor(data);
		expect(average.r).toBe(128);
		expect(average.g).toBe(0);
		expect(average.b).toBe(128);
		expect(average.transparent).toBe(1);
		expect(average.pixels).toBe(510);
	});

	it("returns black for a fully transparent image", () => {
		const average = averageColor(new Uint8ClampedArray([0, 0, 0, 0]));
		expect(average.hex).toBe("#000000");
		expect(average.pixels).toBe(0);
	});

	it("picks a pixel with bounds clamping", () => {
		const data = new Uint8ClampedArray([
			10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
		]);
		expect(pickColor(data, 2, 2, 1, 0)).toMatchObject({
			r: 40,
			g: 50,
			b: 60,
			hex: "#28323c",
		});
		expect(pickColor(data, 2, 2, 99, 99).hex).toBe("#646e78");
	});

	it("chooses readable ink", () => {
		expect(readableInk({ r: 255, g: 255, b: 255 })).toBe("#0a0e14");
		expect(readableInk({ r: 0, g: 0, b: 0 })).toBe("#ffffff");
	});

	it("finds the busiest colors and skips transparent pixels", () => {
		const data = new Uint8ClampedArray(8 * 4);
		for (let index = 0; index < 5; index += 1) {
			data.set([200, 30, 40, 255], index * 4);
		}
		data.set([10, 120, 240, 255], 5 * 4);
		data.set([11, 121, 241, 255], 6 * 4);
		data.set([0, 0, 0, 0], 7 * 4);
		const palette = dominantColors(data, 4);
		expect(palette).toHaveLength(2);
		expect(palette[0]?.pixels).toBe(5);
		expect(palette[0]?.hex).toBe("#c81e28");
		expect(palette[1]?.pixels).toBe(2);
		expect(dominantColors(data, 0)).toEqual([]);
	});
});