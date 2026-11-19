import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkKeySets, flattenKeys } from "../../scripts/check-locales.mjs";

describe("locale parity", () => {
	it("keeps every locale on the english key set", () => {
		const dir = join(process.cwd(), "messages");
		const bundles: Record<string, unknown> = {};
		for (const file of readdirSync(dir).filter((name) =>
			name.endsWith(".json"),
		)) {
			bundles[file.slice(0, -".json".length)] = JSON.parse(
				readFileSync(join(dir, file), "utf8"),
			);
		}
		expect(Object.keys(bundles).sort()).toEqual([
			"ar",
			"en",
			"es",
			"fr",
			"id",
			"ja",
			"zh",
		]);
		expect(checkKeySets(bundles)).toEqual([]);
	});

	it("reports missing and extra keys", () => {
		expect(
			checkKeySets({
				en: { a: "A", nested: { b: "B" } },
				id: { a: "A", nested: {}, other: "X" },
			}),
		).toEqual(["id: missing nested.b", "id: extra other"]);
	});

	it("flattens nested keys to dot paths", () => {
		expect(
			flattenKeys({ a: "A", nested: { b: "B", deep: { c: "C" } } }),
		).toEqual(new Set(["a", "nested.b", "nested.deep.c"]));
	});

	it("pins array lengths so sections cannot drift", () => {
		expect(flattenKeys({ list: ["a", "b"] })).toEqual(
			new Set(["list.length:2"]),
		);
		expect(
			checkKeySets({
				en: { sections: [{ h: "A" }, { h: "B" }] },
				id: { sections: [{ h: "A" }] },
			}),
		).toEqual(["id: missing sections.length:2", "id: extra sections.length:1"]);
	});
});
