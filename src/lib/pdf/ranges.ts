export const MAX_SPLIT_GROUPS = 200;

export type PageRangeCode = "invalid" | "outOfRange" | "descending" | "tooMany";

export class PageRangeError extends Error {
	readonly code: PageRangeCode;

	constructor(code: PageRangeCode) {
		super(code);
		this.name = "PageRangeError";
		this.code = code;
	}
}

const SINGLE = /^\d+$/;
const RANGE = /^(\d*)\s*-\s*(\d*)$/;

// each comma group becomes one output pdf. pages are zero based on the way
// out so the worker can copy them straight into a new document.
export function parsePageRanges(input: string, pageCount: number): number[][] {
	if (!Number.isInteger(pageCount) || pageCount < 1) {
		throw new PageRangeError("outOfRange");
	}

	const text = input.trim();
	if (text === "") {
		if (pageCount > MAX_SPLIT_GROUPS) {
			throw new PageRangeError("tooMany");
		}
		return Array.from({ length: pageCount }, (_, index) => [index]);
	}

	const segments = text
		.split(",")
		.map((segment) => segment.trim())
		.filter((segment) => segment !== "");

	if (segments.length === 0) {
		return Array.from({ length: pageCount }, (_, index) => [index]);
	}
	if (segments.length > MAX_SPLIT_GROUPS) {
		throw new PageRangeError("tooMany");
	}

	return segments.map((segment) => {
		let start: number;
		let end: number;

		if (SINGLE.test(segment)) {
			start = Number(segment);
			end = start;
		} else {
			const match = RANGE.exec(segment);
			if (!match || (match[1] === "" && match[2] === "")) {
				throw new PageRangeError("invalid");
			}
			start = match[1] === "" ? 1 : Number(match[1]);
			end = match[2] === "" ? pageCount : Number(match[2]);
		}

		if (start < 1 || end > pageCount) {
			throw new PageRangeError("outOfRange");
		}
		if (start > end) {
			throw new PageRangeError("descending");
		}

		const pages: number[] = [];
		for (let page = start; page <= end; page += 1) {
			pages.push(page - 1);
		}
		return pages;
	});
}
