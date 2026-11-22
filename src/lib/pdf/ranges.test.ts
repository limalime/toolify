import { describe, expect, it } from "vitest";
import { MAX_SPLIT_GROUPS, PageRangeError, parsePageRanges } from "./ranges";

function codeOf(run: () => unknown): string | null {
	try {
		run();
		return null;
	} catch (unknown) {
		return unknown instanceof PageRangeError ? unknown.code : "other";
	}
}

describe("parsePageRanges", () => {
	it("turns a simple range list into zero-based page groups", () => {
		expect(parsePageRanges("1-3, 5", 8)).toEqual([[0, 1, 2], [4]]);
	});

	it("accepts single pages, open ends, and loose spacing", () => {
		expect(parsePageRanges(" 2 , 4- , -3 ", 6)).toEqual([
			[1],
			[3, 4, 5],
			[0, 1, 2],
		]);
	});

	it("keeps the order the user typed", () => {
		expect(parsePageRanges("5, 1", 8)).toEqual([[4], [0]]);
	});

	it("keeps a page that appears in two groups", () => {
		expect(parsePageRanges("2-3, 2", 5)).toEqual([[1, 2], [1]]);
	});

	it("splits every page when the input is empty", () => {
		expect(parsePageRanges("   ", 3)).toEqual([[0], [1], [2]]);
	});

	it("caps an empty split of a very long document", () => {
		expect(parsePageRanges("", MAX_SPLIT_GROUPS)).toHaveLength(
			MAX_SPLIT_GROUPS,
		);
		expect(codeOf(() => parsePageRanges("", MAX_SPLIT_GROUPS + 1))).toBe(
			"tooMany",
		);
	});

	it("ignores empty commas", () => {
		expect(parsePageRanges("1,,3", 4)).toEqual([[0], [2]]);
	});

	it("allows the same page in two output groups", () => {
		expect(parsePageRanges("1, 1", 4)).toEqual([[0], [0]]);
	});

	it("rejects text that is not a range", () => {
		expect(codeOf(() => parsePageRanges("1-3-5", 8))).toBe("invalid");
		expect(codeOf(() => parsePageRanges("abc", 8))).toBe("invalid");
		expect(codeOf(() => parsePageRanges("-", 8))).toBe("invalid");
		expect(codeOf(() => parsePageRanges("1.5-2", 8))).toBe("invalid");
	});

	it("rejects pages outside the document", () => {
		expect(codeOf(() => parsePageRanges("0", 8))).toBe("outOfRange");
		expect(codeOf(() => parsePageRanges("9", 8))).toBe("outOfRange");
		expect(codeOf(() => parsePageRanges("7-10", 8))).toBe("outOfRange");
	});

	it("rejects a range that runs backwards", () => {
		expect(codeOf(() => parsePageRanges("5-3", 8))).toBe("descending");
	});

	it("caps the number of output files", () => {
		const input = Array.from({ length: MAX_SPLIT_GROUPS + 1 }, (_, index) =>
			String(index + 1),
		).join(",");
		expect(codeOf(() => parsePageRanges(input, 200))).toBe("tooMany");
	});

	it("rejects a document with no pages", () => {
		expect(codeOf(() => parsePageRanges("1", 0))).toBe("outOfRange");
	});
});
