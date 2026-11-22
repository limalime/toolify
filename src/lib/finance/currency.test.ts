import { describe, expect, it } from "vitest";
import {
	convertCurrency,
	formatMoney,
	formatRate,
	formatRateDate,
	isCacheFresh,
	parseRatesPayload,
	RATE_CACHE_TTL_MS,
	readRateCache,
	writeRateCache,
} from "./currency";

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => {
			data.set(key, value);
		},
		removeItem: (key: string) => {
			data.delete(key);
		},
	};
}

const payload = [
	{ date: "2026-11-20", base: "USD", quote: "EUR", rate: 0.91 },
	{ date: "2026-11-20", base: "USD", quote: "IDR", rate: 18263 },
];

describe("currency rates", () => {
	it("parses the v2 rows into a rate table", () => {
		expect(parseRatesPayload(payload, "USD")).toEqual({
			date: "2026-11-20",
			rates: { EUR: 0.91, IDR: 18263 },
		});
	});

	it("rejects empty or malformed payloads", () => {
		expect(() => parseRatesPayload([], "USD")).toThrow("invalid rates");
		expect(() => parseRatesPayload({ rates: {} }, "USD")).toThrow(
			"invalid rates",
		);
		expect(() =>
			parseRatesPayload(
				[{ date: "2026-11-20", base: "EUR", quote: "USD", rate: 1.1 }],
				"USD",
			),
		).toThrow("invalid rates");
	});

	it("converts through the base table", () => {
		const table = {
			base: "USD" as const,
			date: "2026-11-20",
			rates: { EUR: 0.91, IDR: 18263 },
			fetchedAt: 1,
		};
		expect(convertCurrency(100, "USD", "EUR", table)).toBeCloseTo(91);
		expect(convertCurrency(100, "USD", "USD", table)).toBe(100);
		expect(() => convertCurrency(1, "USD", "GBP", table)).toThrow(
			"missing rate",
		);
	});

	it("round trips the one day cache", () => {
		const storage = memoryStorage();
		const table = {
			base: "USD" as const,
			date: "2026-11-20",
			rates: { EUR: 0.91 },
			fetchedAt: 1_000,
		};
		writeRateCache(table, storage);
		expect(readRateCache("USD", storage)).toEqual(table);
		expect(readRateCache("EUR", storage)).toBeNull();
		expect(isCacheFresh(table, 1_000 + RATE_CACHE_TTL_MS - 1)).toBe(true);
		expect(isCacheFresh(table, 1_000 + RATE_CACHE_TTL_MS)).toBe(false);
	});

	it("ignores corrupt cache entries", () => {
		const storage = memoryStorage();
		storage.setItem("toolify:fx:USD", "{");
		expect(readRateCache("USD", storage)).toBeNull();
		storage.setItem(
			"toolify:fx:USD",
			JSON.stringify({ base: "USD", date: "2026-11-20", rates: {} }),
		);
		expect(readRateCache("USD", storage)).toBeNull();
	});
});

describe("currency formatting", () => {
	it("formats money, rates, and dates", () => {
		expect(formatMoney(1234.5, "USD", "en-US")).toBe("$1,234.50");
		expect(formatRate(0.90992, "en-US")).toBe("0.90992");
		expect(formatRateDate("2026-11-20", "en-US")).toBe("Nov 20, 2026");
		expect(formatRateDate("bogus", "en-US")).toBe("bogus");
	});
});
