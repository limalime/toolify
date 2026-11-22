import { describe, expect, it } from "vitest";
import {
	decreasedValue,
	increasedValue,
	percentChange,
	percentOf,
} from "./percentage";

describe("percentage math", () => {
	it("finds a percent of a number", () => {
		expect(percentOf(15, 240)).toBeCloseTo(36);
		expect(percentOf(15, -240)).toBeCloseTo(-36);
		expect(percentOf(0, 240)).toBe(0);
	});

	it("finds percent change", () => {
		expect(percentChange(80, 100)).toBeCloseTo(25);
		expect(percentChange(100, 80)).toBeCloseTo(-20);
		expect(percentChange(0, 100)).toBeNull();
	});

	it("applies increase and decrease", () => {
		expect(increasedValue(200, 10)).toBeCloseTo(220);
		expect(decreasedValue(200, 10)).toBeCloseTo(180);
		expect(increasedValue(200, -10)).toBeCloseTo(180);
	});
});
