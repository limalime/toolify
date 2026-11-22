export const UNIT_CATEGORIES = [
	"length",
	"weight",
	"temperature",
	"volume",
	"area",
	"speed",
	"time",
	"data",
] as const;

export type UnitCategory = (typeof UNIT_CATEGORIES)[number];

export interface UnitOption {
	id: string;
	symbol: string;
}

interface LinearUnit extends UnitOption {
	factor: number;
}

const LINEAR: Record<
	Exclude<UnitCategory, "temperature">,
	readonly LinearUnit[]
> = {
	length: [
		{ id: "mm", symbol: "mm", factor: 0.001 },
		{ id: "cm", symbol: "cm", factor: 0.01 },
		{ id: "m", symbol: "m", factor: 1 },
		{ id: "km", symbol: "km", factor: 1000 },
		{ id: "in", symbol: "in", factor: 0.0254 },
		{ id: "ft", symbol: "ft", factor: 0.3048 },
		{ id: "yd", symbol: "yd", factor: 0.9144 },
		{ id: "mi", symbol: "mi", factor: 1609.344 },
		{ id: "nmi", symbol: "nmi", factor: 1852 },
	],
	weight: [
		{ id: "mg", symbol: "mg", factor: 0.001 },
		{ id: "g", symbol: "g", factor: 1 },
		{ id: "kg", symbol: "kg", factor: 1000 },
		{ id: "t", symbol: "t", factor: 1_000_000 },
		{ id: "oz", symbol: "oz", factor: 28.349523125 },
		{ id: "lb", symbol: "lb", factor: 453.59237 },
		{ id: "st", symbol: "st", factor: 6350.29318 },
	],
	volume: [
		{ id: "ml", symbol: "mL", factor: 0.001 },
		{ id: "l", symbol: "L", factor: 1 },
		{ id: "m3", symbol: "m³", factor: 1000 },
		{ id: "tsp", symbol: "tsp", factor: 0.00492892159375 },
		{ id: "tbsp", symbol: "tbsp", factor: 0.01478676478125 },
		{ id: "floz", symbol: "fl oz", factor: 0.0295735295625 },
		{ id: "cup", symbol: "cup", factor: 0.2365882365 },
		{ id: "pt", symbol: "pt", factor: 0.473176473 },
		{ id: "qt", symbol: "qt", factor: 0.946352946 },
		{ id: "gal", symbol: "gal", factor: 3.785411784 },
	],
	area: [
		{ id: "mm2", symbol: "mm²", factor: 0.000001 },
		{ id: "cm2", symbol: "cm²", factor: 0.0001 },
		{ id: "m2", symbol: "m²", factor: 1 },
		{ id: "ha", symbol: "ha", factor: 10_000 },
		{ id: "km2", symbol: "km²", factor: 1_000_000 },
		{ id: "in2", symbol: "in²", factor: 0.00064516 },
		{ id: "ft2", symbol: "ft²", factor: 0.09290304 },
		{ id: "yd2", symbol: "yd²", factor: 0.83612736 },
		{ id: "acre", symbol: "acre", factor: 4046.8564224 },
	],
	speed: [
		{ id: "mps", symbol: "m/s", factor: 1 },
		{ id: "kmh", symbol: "km/h", factor: 1 / 3.6 },
		{ id: "mph", symbol: "mph", factor: 0.44704 },
		{ id: "kn", symbol: "kn", factor: 0.5144444444444445 },
		{ id: "fts", symbol: "ft/s", factor: 0.3048 },
	],
	time: [
		{ id: "ms", symbol: "ms", factor: 0.001 },
		{ id: "s", symbol: "s", factor: 1 },
		{ id: "min", symbol: "min", factor: 60 },
		{ id: "h", symbol: "h", factor: 3600 },
		{ id: "day", symbol: "d", factor: 86_400 },
		{ id: "wk", symbol: "wk", factor: 604_800 },
		{ id: "mo", symbol: "mo", factor: 2_629_746 },
		{ id: "yr", symbol: "yr", factor: 31_556_952 },
	],
	data: [
		{ id: "b", symbol: "B", factor: 1 },
		{ id: "kb", symbol: "KB", factor: 1000 },
		{ id: "mb", symbol: "MB", factor: 1_000_000 },
		{ id: "gb", symbol: "GB", factor: 1_000_000_000 },
		{ id: "tb", symbol: "TB", factor: 1_000_000_000_000 },
		{ id: "kib", symbol: "KiB", factor: 1024 },
		{ id: "mib", symbol: "MiB", factor: 1_048_576 },
		{ id: "gib", symbol: "GiB", factor: 1_073_741_824 },
		{ id: "tib", symbol: "TiB", factor: 1_099_511_627_776 },
	],
};

const TEMPERATURE: readonly UnitOption[] = [
	{ id: "c", symbol: "°C" },
	{ id: "f", symbol: "°F" },
	{ id: "k", symbol: "K" },
];

export const UNITS: Record<UnitCategory, readonly UnitOption[]> = {
	length: LINEAR.length,
	weight: LINEAR.weight,
	temperature: TEMPERATURE,
	volume: LINEAR.volume,
	area: LINEAR.area,
	speed: LINEAR.speed,
	time: LINEAR.time,
	data: LINEAR.data,
};

export const DEFAULT_UNITS: Record<UnitCategory, [string, string]> = {
	length: ["km", "mi"],
	weight: ["kg", "lb"],
	temperature: ["c", "f"],
	volume: ["l", "gal"],
	area: ["m2", "ft2"],
	speed: ["kmh", "mph"],
	time: ["h", "day"],
	data: ["gb", "mb"],
};

export function unitOptions(category: UnitCategory): readonly UnitOption[] {
	return UNITS[category];
}

function toCelsius(value: number, unit: string): number {
	if (unit === "c") {
		return value;
	}
	if (unit === "f") {
		return ((value - 32) * 5) / 9;
	}
	if (unit === "k") {
		return value - 273.15;
	}
	throw new Error(`unknown temperature unit: ${unit}`);
}

function fromCelsius(value: number, unit: string): number {
	if (unit === "c") {
		return value;
	}
	if (unit === "f") {
		return (value * 9) / 5 + 32;
	}
	if (unit === "k") {
		return value + 273.15;
	}
	throw new Error(`unknown temperature unit: ${unit}`);
}

export function convertUnit(
	category: UnitCategory,
	value: number,
	from: string,
	to: string,
): number {
	if (!Number.isFinite(value)) {
		return Number.NaN;
	}
	if (category === "temperature") {
		if (from === to) {
			return value;
		}
		return fromCelsius(toCelsius(value, from), to);
	}

	const table = LINEAR[category];
	const source = table.find((unit) => unit.id === from);
	const target = table.find((unit) => unit.id === to);
	if (!source || !target) {
		throw new Error(`unknown ${category} unit: ${from} to ${to}`);
	}
	return (value * source.factor) / target.factor;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(locale: string): Intl.NumberFormat {
	const cached = formatterCache.get(locale);
	if (cached) {
		return cached;
	}
	const next = new Intl.NumberFormat(locale, {
		maximumSignificantDigits: 10,
		useGrouping: true,
	});
	formatterCache.set(locale, next);
	return next;
}

export function formatUnitValue(value: number, locale: string): string {
	if (!Number.isFinite(value)) {
		return "";
	}
	const format = formatter(locale);
	const text = format.format(value);
	if (text.includes("e") || text.includes("E")) {
		return value.toFixed(12);
	}
	return text;
}
