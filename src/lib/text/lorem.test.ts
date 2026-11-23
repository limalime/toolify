import { describe, expect, it } from "vitest";
import { generateLorem, seededRandom, wordCount } from "./lorem";

describe("lorem ipsum", () => {
	it("is deterministic with a seed", () => {
		const a = generateLorem({
			paragraphs: 2,
			sentences: 3,
			startWithLorem: true,
			random: seededRandom(7),
		});
		const b = generateLorem({
			paragraphs: 2,
			sentences: 3,
			startWithLorem: true,
			random: seededRandom(7),
		});
		expect(a).toBe(b);
	});

	it("starts with the classic line when asked", () => {
		const text = generateLorem({
			paragraphs: 1,
			sentences: 2,
			startWithLorem: true,
			random: seededRandom(3),
		});
		expect(text.startsWith("Lorem ipsum dolor sit amet")).toBe(true);
		expect(text).not.toContain("\n\n");
	});

	it("makes the requested number of paragraphs", () => {
		const text = generateLorem({
			paragraphs: 4,
			sentences: 2,
			startWithLorem: false,
			random: seededRandom(11),
		});
		expect(text.split("\n\n")).toHaveLength(4);
		expect(wordCount(text)).toBeGreaterThan(20);
	});

	it("clamps silly counts and counts words safely", () => {
		const text = generateLorem({
			paragraphs: 999,
			sentences: 0,
			startWithLorem: false,
			random: seededRandom(5),
		});
		expect(text.split("\n\n")).toHaveLength(20);
		expect(wordCount("   ")).toBe(0);
	});
});