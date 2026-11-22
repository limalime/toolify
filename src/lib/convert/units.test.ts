import { describe, expect, it } from "vitest";
import {
	convertUnit,
	DEFAULT_UNITS,
	formatUnitValue,
	UNIT_CATEGORIES,
	unitOptions,
} from "./units";

const close = (value: number, expected: number) =>
	expect(value).toBeCloseTo(expected, 9);

describe("unit converter", () => {
	it("ships all eight categories with a default pair", () => {
		expect(UNIT_CATEGORIES).toHaveLength(8);
		for (const category of UNIT_CATEGORIES) {
			const pair = DEFAULT_UNITS[category];
			expect(pair).toHaveLength(2);
			const ids = unitOptions(category).map((unit) => unit.id);
			expect(ids).toContain(pair[0]);
			expect(ids).toContain(pair[1]);
		}
	});

	it("converts length through the metre base", () => {
		expect(convertUnit("length", 1, "km", "m")).toBe(1000);
		close(convertUnit("length", 1, "mi", "m"), 1609.344);
		close(convertUnit("length", 1, "in", "cm"), 2.54);
		close(convertUnit("length", 3, "ft", "yd"), 1);
	});

	it("converts weight through the gram base", () => {
		expect(convertUnit("weight", 1, "kg", "g")).toBe(1000);
		close(convertUnit("weight", 1, "kg", "lb"), 2.2046226218);
		close(convertUnit("weight", 16, "oz", "lb"), 1);
	});

	it("converts temperature with offsets, not factors", () => {
		expect(convertUnit("temperature", 0, "c", "f")).toBe(32);
		expect(convertUnit("temperature", 100, "c", "f")).toBe(212);
		expect(convertUnit("temperature", -40, "c", "f")).toBe(-40);
		expect(convertUnit("temperature", 0, "c", "k")).toBe(273.15);
		close(convertUnit("temperature", 98.6, "f", "c"), 37);
		close(convertUnit("temperature", 300, "k", "c"), 26.85);
	});

	it("converts volume through the litre base", () => {
		close(convertUnit("volume", 1, "gal", "l"), 3.785411784);
		close(convertUnit("volume", 1, "cup", "floz"), 8);
		close(convertUnit("volume", 1, "l", "ml"), 1000);
	});

	it("converts area through the square metre base", () => {
		close(convertUnit("area", 1, "acre", "m2"), 4046.8564224);
		expect(convertUnit("area", 1, "km2", "ha")).toBe(100);
		expect(convertUnit("area", 1, "m2", "cm2")).toBe(10000);
	});

	it("converts speed through metres per second", () => {
		close(convertUnit("speed", 100, "kmh", "mph"), 62.1371192237);
		close(convertUnit("speed", 1, "kn", "kmh"), 1.852);
		close(convertUnit("speed", 60, "mph", "mps"), 26.8224);
	});

	it("converts time with average calendar lengths", () => {
		expect(convertUnit("time", 1, "day", "h")).toBe(24);
		expect(convertUnit("time", 1, "wk", "day")).toBe(7);
		close(convertUnit("time", 1, "yr", "day"), 365.2425);
		close(convertUnit("time", 1, "mo", "day"), 365.2425 / 12);
	});

	it("converts data size in both decimal and binary units", () => {
		expect(convertUnit("data", 1, "gb", "mb")).toBe(1000);
		expect(convertUnit("data", 1, "gib", "mib")).toBe(1024);
		expect(convertUnit("data", 1, "mb", "b")).toBe(1_000_000);
		expect(convertUnit("data", 1, "tib", "b")).toBe(1_099_511_627_776);
	});

	it("returns the same value for the same unit", () => {
		expect(convertUnit("length", 12.5, "m", "m")).toBe(12.5);
	});

	it("rejects an unknown unit", () => {
		expect(() => convertUnit("length", 1, "m", "parsec")).toThrow();
		expect(() => convertUnit("length", 1, "parsec", "m")).toThrow();
	});

	it("recognises a non numeric value", () => {
		expect(Number.isNaN(convertUnit("length", Number.NaN, "m", "km"))).toBe(
			true,
		);
	});

	it("formats a result for a locale", () => {
		expect(formatUnitValue(1609.344, "en-US")).toBe("1,609.344");
		expect(formatUnitValue(0.621371192237334, "en-US")).toBe("0.6213711922");
		expect(formatUnitValue(1000, "de-DE")).toBe("1.000");
	});

	it("uses plain decimal notation for very small results", () => {
		const text = formatUnitValue(0.0000006213711922, "en-US");
		expect(text).not.toContain("e-");
		expect(text).toBe("0.0000006213711922");
	});
});
