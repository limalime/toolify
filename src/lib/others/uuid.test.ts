import { describe, expect, it } from "vitest";
import { generateUuid, isUuid, UUID_VERSIONS, uuidVersionOf } from "./uuid";

describe("uuid generator", () => {
	it("generates every supported version except v2", () => {
		expect(UUID_VERSIONS).toEqual(["v1", "v3", "v4", "v5", "v6", "v7"]);
		for (const version of UUID_VERSIONS) {
			const value = generateUuid(version, {
				namespace: "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b",
				name: "toolify",
			});
			expect(isUuid(value)).toBe(true);
			expect(uuidVersionOf(value)).toBe(Number(version.slice(1)));
		}
	});

	it("derives v3 and v5 deterministically", () => {
		const namespace = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";
		expect(generateUuid("v3", { namespace, name: "a" })).toBe(
			generateUuid("v3", { namespace, name: "a" }),
		);
		expect(generateUuid("v5", { namespace, name: "a" })).not.toBe(
			generateUuid("v5", { namespace, name: "b" }),
		);
	});

	it("validates namespace input", () => {
		expect(isUuid("not-a-uuid")).toBe(false);
		expect(uuidVersionOf("not-a-uuid")).toBeNull();
		expect(() =>
			generateUuid("v3", { namespace: "bogus", name: "a" }),
		).toThrow();
	});
});
