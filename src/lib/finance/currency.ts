// currency rates come from frankfurter.dev, a free keyless reference rate
// feed. rates are cached per base currency for one day so a repeat visit
// does not hit the network and an offline visit can still convert.

export const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const RATE_CACHE_PREFIX = "toolify:fx:";
export const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rates";

// fiat currencies only. frankfurter also lists crypto assets, which are
// reference rates and not something a travel or invoice conversion wants.
export const CURRENCIES = [
	"USD",
	"EUR",
	"GBP",
	"JPY",
	"CNY",
	"IDR",
	"AUD",
	"CAD",
	"CHF",
	"HKD",
	"SGD",
	"INR",
	"KRW",
	"MYR",
	"THB",
	"PHP",
	"VND",
	"NZD",
	"SEK",
	"NOK",
	"DKK",
	"PLN",
	"CZK",
	"HUF",
	"RON",
	"TRY",
	"BRL",
	"MXN",
	"ARS",
	"CLP",
	"COP",
	"ZAR",
	"EGP",
	"NGN",
	"AED",
	"SAR",
	"ILS",
	"PKR",
	"BDT",
	"LKR",
	"TWD",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export interface RateTable {
	base: string;
	date: string;
	rates: Record<string, number>;
	fetchedAt: number;
}

export interface StorageLike {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
}

interface RateRow {
	base?: unknown;
	date?: unknown;
	quote?: unknown;
	rate?: unknown;
}

// v2 answers with one row per quote currency. every row has to agree on
// the base and carry a usable rate, otherwise the table is unusable.
export function parseRatesPayload(
	payload: unknown,
	base: string,
): { date: string; rates: Record<string, number> } {
	if (!Array.isArray(payload) || payload.length === 0) {
		throw new Error("invalid rates");
	}
	const rates: Record<string, number> = {};
	let date = "";
	for (const raw of payload) {
		if (!raw || typeof raw !== "object") {
			throw new Error("invalid rates");
		}
		const row = raw as RateRow;
		if (
			row.base !== base ||
			typeof row.quote !== "string" ||
			typeof row.rate !== "number" ||
			!Number.isFinite(row.rate) ||
			row.rate <= 0 ||
			typeof row.date !== "string"
		) {
			throw new Error("invalid rates");
		}
		rates[row.quote] = row.rate;
		date = row.date;
	}
	if (!date) {
		throw new Error("invalid rates");
	}
	return { date, rates };
}

// convert through the table base so a EUR table can still answer a
// JPY to USD question when both rates are present.
export function convertCurrency(
	amount: number,
	from: string,
	to: string,
	table: RateTable,
): number {
	if (!Number.isFinite(amount)) {
		throw new Error("invalid amount");
	}
	if (from === to) {
		return amount;
	}
	const fromRate = from === table.base ? 1 : table.rates[from];
	const toRate = to === table.base ? 1 : table.rates[to];
	if (!fromRate || !toRate) {
		throw new Error("missing rate");
	}
	return (amount / fromRate) * toRate;
}

export function cacheKey(base: string): string {
	return `${RATE_CACHE_PREFIX}${base}`;
}

export function readRateCache(
	base: string,
	storage: StorageLike,
): RateTable | null {
	let raw: string | null = null;
	try {
		raw = storage.getItem(cacheKey(base));
	} catch {
		return null;
	}
	if (!raw) {
		return null;
	}
	try {
		const parsed = JSON.parse(raw) as Partial<RateTable>;
		if (
			parsed.base !== base ||
			typeof parsed.date !== "string" ||
			typeof parsed.fetchedAt !== "number" ||
			!Number.isFinite(parsed.fetchedAt) ||
			!parsed.rates ||
			typeof parsed.rates !== "object" ||
			Array.isArray(parsed.rates)
		) {
			return null;
		}
		const rates = Object.fromEntries(
			Object.entries(parsed.rates).filter(
				([, rate]) =>
					typeof rate === "number" && Number.isFinite(rate) && rate > 0,
			),
		);
		if (Object.keys(rates).length === 0) {
			return null;
		}
		return {
			base,
			date: parsed.date,
			rates,
			fetchedAt: parsed.fetchedAt,
		};
	} catch {
		return null;
	}
}

export function writeRateCache(table: RateTable, storage: StorageLike): void {
	try {
		storage.setItem(cacheKey(table.base), JSON.stringify(table));
	} catch {
		// private mode and full storage both throw. a missing cache only
		// costs a network request next time, so the page keeps working.
	}
}

export function isCacheFresh(table: RateTable, now: number): boolean {
	return now - table.fetchedAt < RATE_CACHE_TTL_MS;
}

export function formatMoney(
	amount: number,
	currency: string,
	locale: string,
): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
		}).format(amount);
	} catch {
		return `${formatRate(amount, locale)} ${currency}`;
	}
}

// small rates need more decimals to stay meaningful. a rate of 0.91 is
// useless rounded to two places, 18263 is noise past the units.
export function formatRate(rate: number, locale: string): string {
	if (!Number.isFinite(rate)) {
		return "0";
	}
	const maximumFractionDigits = rate >= 100 ? 2 : rate >= 1 ? 4 : 5;
	return new Intl.NumberFormat(locale, {
		maximumFractionDigits,
		minimumFractionDigits: 0,
	}).format(rate);
}

export function formatRateDate(iso: string, locale: string): string {
	const date = new Date(`${iso}T00:00:00Z`);
	if (Number.isNaN(date.getTime())) {
		return iso;
	}
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		timeZone: "UTC",
		year: "numeric",
	}).format(date);
}

export function ratesUrl(base: string): string {
	const quotes = CURRENCIES.filter((code) => code !== base).join(",");
	return `${FRANKFURTER_URL}?base=${base}&quotes=${quotes}`;
}
