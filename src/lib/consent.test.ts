import { describe, expect, it } from "vitest";
import {
	CONSENT_STORAGE_KEY,
	clearConsent,
	isEeaCountry,
	readConsent,
	writeConsent,
} from "./consent";

function memoryStorage(): Storage {
	const values = new Map<string, string>();
	return {
		get length() {
			return values.size;
		},
		clear: () => values.clear(),
		getItem: (key) => values.get(key) ?? null,
		key: (index) => [...values.keys()][index] ?? null,
		removeItem: (key) => {
			values.delete(key);
		},
		setItem: (key, value) => {
			values.set(key, value);
		},
	};
}

describe("consent region", () => {
	it("requires consent across the eea, uk, and switzerland", () => {
		for (const country of [
			"DE",
			"FR",
			"IE",
			"ES",
			"PL",
			"NO",
			"IS",
			"LI",
			"GB",
			"CH",
			"GI",
		]) {
			expect(isEeaCountry(country), country).toBe(true);
		}
	});

	it("does not require the banner elsewhere", () => {
		for (const country of ["US", "CA", "BR", "JP", "AU", "IN"]) {
			expect(isEeaCountry(country), country).toBe(false);
		}
	});

	it("treats unknown and blank countries as needing consent", () => {
		expect(isEeaCountry(null)).toBe(true);
		expect(isEeaCountry(undefined)).toBe(true);
		expect(isEeaCountry("")).toBe(true);
		expect(isEeaCountry("XX")).toBe(true);
	});

	it("accepts lowercase country codes", () => {
		expect(isEeaCountry("de")).toBe(true);
		expect(isEeaCountry("us")).toBe(false);
	});
});

describe("consent storage", () => {
	it("round trips a decision", () => {
		const storage = memoryStorage();
		expect(readConsent(storage)).toBeNull();
		writeConsent("granted", storage);
		expect(storage.getItem(CONSENT_STORAGE_KEY)).toBe("granted");
		expect(readConsent(storage)).toBe("granted");
		writeConsent("denied", storage);
		expect(readConsent(storage)).toBe("denied");
	});

	it("ignores values it did not write", () => {
		const storage = memoryStorage();
		storage.setItem(CONSENT_STORAGE_KEY, "yes");
		expect(readConsent(storage)).toBeNull();
	});

	it("clears the decision", () => {
		const storage = memoryStorage();
		writeConsent("granted", storage);
		clearConsent(storage);
		expect(readConsent(storage)).toBeNull();
	});

	it("survives storage that refuses to work", () => {
		const broken = {
			...memoryStorage(),
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
			removeItem: () => {
				throw new Error("blocked");
			},
		} as Storage;
		expect(readConsent(broken)).toBeNull();
		expect(() => writeConsent("granted", broken)).not.toThrow();
		expect(() => clearConsent(broken)).not.toThrow();
	});
});
