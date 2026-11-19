import { describe, expect, it } from "vitest";
import { buildLlmsTxt } from "./llms";

describe("llms.txt builder", () => {
	it("lists pages without advertising vapor tools", () => {
		const text = buildLlmsTxt([]);
		expect(text).toContain("# Toolify");
		expect(text).toContain("## Pages");
		expect(text).toContain("https://toolify.bond/about");
		expect(text).not.toContain("## Tools");
	});

	it("lists every shipped tool in every locale", () => {
		const text = buildLlmsTxt([{ slug: "png-to-jpg", name: "PNG to JPG" }]);
		expect(text).toContain("### PNG to JPG");
		expect(text).toContain("https://toolify.bond/png-to-jpg");
		expect(text).toContain("https://toolify.bond/id/png-to-jpg");
		expect(text).toContain("https://toolify.bond/ar/png-to-jpg");
	});
});
