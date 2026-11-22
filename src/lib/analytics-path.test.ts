import { describe, expect, it } from "vitest";
import { localeFromPath, toolSlugFromPath } from "./analytics";

describe("analytics path parsing", () => {
	it("reads the tool slug at the root", () => {
		expect(toolSlugFromPath("/image-converter")).toBe("image-converter");
		expect(toolSlugFromPath("/unit-converter/")).toBe("unit-converter");
	});

	it("reads the tool slug behind a locale", () => {
		expect(toolSlugFromPath("/id/image-converter")).toBe("image-converter");
		expect(toolSlugFromPath("/ar/unit-converter")).toBe("unit-converter");
	});

	it("returns null for pages that are not tools", () => {
		expect(toolSlugFromPath("/")).toBeNull();
		expect(toolSlugFromPath("/id")).toBeNull();
		expect(toolSlugFromPath("/id/")).toBeNull();
		expect(toolSlugFromPath("/privacy")).toBeNull();
		expect(toolSlugFromPath("/id/privacy")).toBeNull();
		expect(toolSlugFromPath("/not-a-tool")).toBeNull();
	});

	it("reads the locale, defaulting to english", () => {
		expect(localeFromPath("/")).toBe("en");
		expect(localeFromPath("/image-converter")).toBe("en");
		expect(localeFromPath("/id/image-converter")).toBe("id");
		expect(localeFromPath("/ar")).toBe("ar");
		expect(localeFromPath("/fr/privacy")).toBe("fr");
	});
});
