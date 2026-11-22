import { describe, expect, it } from "vitest";
import {
	buildPalette,
	hexToRgb,
	normalizeHex,
	paletteToCss,
	paletteToJson,
	readableInk,
	rgbToHex,
	rgbToHsl,
	rotateHue,
} from "./palette";

describe("colour palette", () => {
	it("normalises hex input", () => {
		expect(normalizeHex("#1B56FD")).toBe("#1b56fd");
		expect(normalizeHex("1b56fd")).toBe("#1b56fd");
		expect(normalizeHex("#ABC")).toBe("#aabbcc");
		expect(normalizeHex("  #fff  ")).toBe("#ffffff");
	});

	it("rejects malformed hex", () => {
		expect(normalizeHex("")).toBeNull();
		expect(normalizeHex("#12345")).toBeNull();
		expect(normalizeHex("#gggggg")).toBeNull();
		expect(normalizeHex("blue")).toBeNull();
	});

	it("converts between rgb, hex, and hsl", () => {
		expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
		expect(rgbToHex({ r: 27, g: 86, b: 253 })).toBe("#1b56fd");
		const red = rgbToHsl({ r: 255, g: 0, b: 0 });
		expect(red).toEqual({ h: 0, s: 100, l: 50 });
		expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({
			h: 0,
			s: 0,
			l: 50.19607843137255,
		});
	});

	it("rotates hue and wraps around", () => {
		const base = "#1b56fd";
		const forward = rotateHue(base, 180);
		const backward = rotateHue(base, -180);
		expect(forward).toBe(backward);
		expect(rotateHue(base, 360)).toBe(base);
		expect(rotateHue("#808080", 120)).toBe("#808080");
	});

	it("builds an analogous palette around the base", () => {
		const palette = buildPalette("#1b56fd", "analogous");
		expect(palette).toHaveLength(5);
		expect(palette[2]).toBe("#1b56fd");
		const baseHue = rgbToHsl(hexToRgb("#1b56fd")).h;
		const hues = palette.map((color) => rgbToHsl(hexToRgb(color)).h);
		expect(hues[3]).toBeCloseTo((baseHue + 30) % 360, 0);
		expect(hues[1]).toBeCloseTo((baseHue + 330) % 360, 0);
	});

	it("builds a complementary pair", () => {
		const palette = buildPalette("#1b56fd", "complementary");
		expect(palette).toHaveLength(2);
		expect(palette[0]).toBe("#1b56fd");
		expect(palette[1]).toBe(rotateHue("#1b56fd", 180));
	});

	it("builds a triadic set", () => {
		const palette = buildPalette("#1b56fd", "triadic");
		expect(palette).toHaveLength(3);
		expect(palette[0]).toBe("#1b56fd");
		expect(palette[1]).toBe(rotateHue("#1b56fd", 120));
		expect(palette[2]).toBe(rotateHue("#1b56fd", 240));
	});

	it("picks readable ink for a swatch", () => {
		expect(readableInk("#ffffff")).toBe("#0a0e14");
		expect(readableInk("#000000")).toBe("#ffffff");
		expect(readableInk("#1b56fd")).toBe("#ffffff");
	});

	it("exports css variables", () => {
		const css = paletteToCss(["#1b56fd", "#56fd1b"], "My base");
		expect(css).toContain("/* My base */");
		expect(css).toContain("--palette-1: #1b56fd;");
		expect(css).toContain("--palette-2: #56fd1b;");
	});

	it("exports parseable json", () => {
		const json = paletteToJson({
			base: "#1b56fd",
			harmony: "triadic",
			colors: ["#1b56fd", "#fd1b56", "#56fd1b"],
		});
		expect(JSON.parse(json)).toEqual({
			base: "#1b56fd",
			harmony: "triadic",
			colors: ["#1b56fd", "#fd1b56", "#56fd1b"],
		});
	});
});
