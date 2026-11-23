import { describe, expect, it } from "vitest";
import { PDF_DPI_CAP, sizeVerdict } from "../pdf/compress";
import { formatCount, wrapLines } from "./mockup";

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
	it("maps quality to a dpi cap", () => {
		expect(PDF_DPI_CAP.low).toBeLessThan(PDF_DPI_CAP.medium);
		expect(PDF_DPI_CAP.medium).toBeLessThan(PDF_DPI_CAP.high);
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
});
