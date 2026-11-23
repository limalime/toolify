import { describe, expect, it } from "vitest";
import { formatCount, wrapLines } from "./mockup";
import { pageSizeAt, PDF_QUALITY_SCALE, sizeVerdict } from "../pdf/compress";

describe("mockup helpers", () => {
	it("wraps words by measured width", () => {
		const measure = (value: string) => value.length * 10;
		expect(wrapLines("one two three four", 80, measure)).toEqual([
			"one two",
			"three",
			"four",
		]);
		expect(wrapLines("a\n\nb", 100, measure)).toEqual(["a", "", "b"]);
		expect(wrapLines("supercalifragilistic", 20, measure)).toEqual([
			"supercalifragilistic",
		]);
	});

	it("formats social counts", () => {
		expect(formatCount(999)).toBe("999");
		expect(formatCount(1500)).toBe("1.5K");
		expect(formatCount(2_400_000)).toBe("2.4M");
		expect(formatCount(-2)).toBe("0");
	});
});

describe("pdf compression helpers", () => {
	it("maps quality to render scale and jpeg quality", () => {
		expect(PDF_QUALITY_SCALE.low).toBeLessThan(PDF_QUALITY_SCALE.medium);
		expect(PDF_QUALITY_SCALE.medium).toBeLessThan(PDF_QUALITY_SCALE.high);
	});

	it("reports honest size verdicts", () => {
		expect(sizeVerdict(1000, 400)).toEqual({
			smaller: true,
			percent: 60,
			label: "smaller",
		});
		expect(sizeVerdict(1000, 1300).label).toBe("larger");
		expect(sizeVerdict(1000, 1002).label).toBe("same");
		expect(sizeVerdict(0, 100).label).toBe("same");
	});

	it("rounds page sizes to whole pixels", () => {
		expect(pageSizeAt(612.4, 792.6)).toEqual({ width: 612, height: 793 });
		expect(pageSizeAt(0, 0)).toEqual({ width: 1, height: 1 });
	});
});