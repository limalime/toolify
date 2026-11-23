import { describe, expect, it } from "vitest";
import {
	jsonErrorOffset,
	positionAt,
	tagBalance,
	validateJson,
} from "./validate";

describe("code validation", () => {
	it("maps an offset to line and column", () => {
		expect(positionAt("abc\ndef", 5)).toEqual({
			line: 2,
			column: 2,
			offset: 5,
		});
		expect(positionAt("abc", 99)).toEqual({
			line: 1,
			column: 4,
			offset: 3,
		});
	});

	it("finds the json error position in both message styles", () => {
		expect(jsonErrorOffset("Unexpected token } in JSON at position 12", "")).toBe(
			12,
		);
		expect(jsonErrorOffset("Expected comma at line 3 column 4", "a\nbb\ncccc")).toBe(
			8,
		);
	});

	it("validates json and points at bad spots", () => {
		expect(validateJson('{"a": 1}')).toEqual({ ok: true });
		expect(validateJson("  ").ok).toBe(false);
		const bad = validateJson('{\n  "a": 1,\n}');
		expect(bad.ok).toBe(false);
		expect(bad.position?.line).toBe(3);
		expect(bad.message).toBeTruthy();
	});

	it("balances html tags and ignores voids and comments", () => {
		expect(tagBalance("<div><p>hi</p><br></div>").ok).toBe(true);
		expect(tagBalance("<!-- <div> --><span>x</span>").ok).toBe(true);
		const broken = tagBalance("<div><span>x</div>");
		expect(broken.ok).toBe(false);
		expect(broken.unclosed).toContain("span");
		expect(tagBalance("<div></section>").unexpected).toContain("section");
	});
});