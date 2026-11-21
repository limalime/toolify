import { describe, expect, it } from "vitest";
import { exportMarkdown, noteTitle } from "./notes";

describe("notes", () => {
	it("titles from the first line", () => {
		expect(noteTitle("Hello\nsecond")).toBe("Hello");
		expect(noteTitle("   \n  ")).toBe("Empty note");
		expect(noteTitle("x".repeat(100))).toBe(`${"x".repeat(60)}…`);
	});

	it("exports markdown with separators", () => {
		const markdown = exportMarkdown([
			{ id: "a", body: "First\nbody", updatedAt: 2 },
			{ id: "b", body: "Second", updatedAt: 1 },
		]);
		expect(markdown).toContain("# First");
		expect(markdown).toContain("---");
		expect(markdown.endsWith("\n")).toBe(true);
	});
});
