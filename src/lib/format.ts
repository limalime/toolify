const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

const COUNT_UNITS: Array<[number, string]> = [
	[1e9, "B"],
	[1e6, "M"],
	[1e3, "K"],
];

// one decimal, drop the trailing .0 so 1024 reads 1 KB not 1.0 KB
function trimOne(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

// 1536 -> 1.5 KB, used for before and after file sizes
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) {
		return "0 B";
	}
	if (bytes < 1024) {
		return `${Math.floor(bytes)} B`;
	}
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${trimOne(value)} ${BYTE_UNITS[unit]}`;
}

// 68810 -> 68.81K, used for counts and stats
export function formatCompact(count: number): string {
	if (!Number.isFinite(count) || count < 0) {
		return "0";
	}
	for (const [size, suffix] of COUNT_UNITS) {
		if (count >= size) {
			const value = count / size;
			const text =
				value >= 100 ? trimOne(value) : String(Math.round(value * 100) / 100);
			return `${text}${suffix}`;
		}
	}
	return String(Math.floor(count));
}
