import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, localizedPath } from "./locales";

describe("locales", () => {
	it("ships exactly seven locales with english first", () => {
		expect(LOCALES).toHaveLength(7);
		expect(LOCALES[0]?.code).toBe("en");
		expect(DEFAULT_LOCALE).toBe("en");
	});

	it("marks arabic right to left and the rest left to right", () => {
		for (const locale of LOCALES) {
			expect(locale.dir).toBe(locale.code === "ar" ? "rtl" : "ltr");
		}
	});
});

describe("localizedPath", () => {
	it("keeps english at the root", () => {
		expect(localizedPath("/", "en")).toBe("/");
		expect(localizedPath("/png-to-jpg", "en")).toBe("/png-to-jpg");
	});

	it("prefixes other locales", () => {
		expect(localizedPath("/", "id")).toBe("/id");
		expect(localizedPath("/png-to-jpg", "es")).toBe("/es/png-to-jpg");
	});

	it("swaps an existing prefix instead of stacking", () => {
		expect(localizedPath("/id/png-to-jpg", "es")).toBe("/es/png-to-jpg");
		expect(localizedPath("/ar/tool", "ar")).toBe("/ar/tool");
	});

	it("strips the prefix when switching back to english", () => {
		expect(localizedPath("/id", "en")).toBe("/");
		expect(localizedPath("/ja/png-to-jpg", "en")).toBe("/png-to-jpg");
	});
});
