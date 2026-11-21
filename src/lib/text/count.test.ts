import { describe, expect, it } from "vitest";
import { countText, formatReadingTime } from "./count";

describe("text counter", () => {
	it("counts an empty document as zero", () => {
		expect(countText("   ")).toMatchObject({
			characters: 3,
			charactersNoSpaces: 0,
			words: 0,
			sentences: 0,
			paragraphs: 0,
			readingSeconds: 0,
		});
	});

	it("counts words, sentences, and paragraphs", () => {
		const counts = countText(
			"Hello world. How are you?\n\nSecond paragraph here.",
		);
		expect(counts.words).toBe(8);
		expect(counts.sentences).toBe(3);
		expect(counts.paragraphs).toBe(2);
		expect(counts.charactersNoSpaces).toBeLessThan(counts.characters);
	});

	it("counts unicode characters, not utf-16 units", () => {
		expect(countText("héllo 👋").characters).toBe(7);
	});

	it("formats reading time", () => {
		expect(formatReadingTime(0)).toBe("0s");
		expect(formatReadingTime(45)).toBe("45s");
		expect(formatReadingTime(120)).toBe("2m");
		expect(formatReadingTime(150)).toBe("2m 30s");
	});
});
