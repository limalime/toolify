export interface WheelSegment {
	label: string;
	start: number;
	end: number;
	mid: number;
}

// even slices, angles in radians starting at 12 o'clock and moving clockwise.
export function wheelSegments(labels: string[]): WheelSegment[] {
	const count = labels.length;
	if (count === 0) {
		return [];
	}
	const step = (Math.PI * 2) / count;
	return labels.map((label, index) => ({
		label,
		start: index * step,
		end: (index + 1) * step,
		mid: index * step + step / 2,
	}));
}

export function pickIndex(count: number, random: number): number {
	if (count <= 0) {
		return -1;
	}
	return Math.min(count - 1, Math.max(0, Math.floor(random * count)));
}

// the pointer sits at 12 o'clock. to land on a segment we rotate the
// wheel so that the segment midpoint sits under the pointer, then add
// whole turns for the spin animation.
export function rotationFor(index: number, count: number, turns = 5): number {
	if (count <= 0) {
		return 0;
	}
	const step = (Math.PI * 2) / count;
	const mid = index * step + step / 2;
	return turns * Math.PI * 2 - mid;
}

export function normalizeRotation(rotation: number): number {
	const full = Math.PI * 2;
	return ((rotation % full) + full) % full;
}

export function segmentAt(rotation: number, count: number): number {
	if (count <= 0) {
		return -1;
	}
	const step = (Math.PI * 2) / count;
	const angle = normalizeRotation(-rotation);
	return Math.min(count - 1, Math.floor(angle / step));
}

export const WHEEL_COLORS = [
	"#1b56fd",
	"#7da2fe",
	"#ffb020",
	"#2ed573",
	"#ff5c5c",
	"#a78bfa",
	"#22d3ee",
	"#f472b6",
];

export const MAX_WHEEL_HASH = 2_400;
export const MAX_WHEEL_LABELS = 24;
export const MAX_WHEEL_COLORS = 8;

const MAX_LABEL_LENGTH = 40;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export interface WheelConfig {
	labels: string[];
	colors: string[];
}

function toBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
	const padded = value.replaceAll("-", "+").replaceAll("_", "/");
	const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export function cleanWheelConfig(config: WheelConfig): WheelConfig {
	const labels = config.labels
		.map((label) => label.trim().slice(0, MAX_LABEL_LENGTH))
		.filter(Boolean)
		.slice(0, MAX_WHEEL_LABELS);
	const colors = config.colors
		.filter((color) => COLOR_PATTERN.test(color))
		.slice(0, MAX_WHEEL_COLORS);
	return {
		labels,
		colors: colors.length ? colors : WHEEL_COLORS.slice(0, MAX_WHEEL_COLORS),
	};
}

// the share token holds labels and colors only. an uploaded centre image
// stays on the device and is never encoded.
export function encodeWheel(config: WheelConfig): string {
	const clean = cleanWheelConfig(config);
	return toBase64Url(
		JSON.stringify({ v: 1, l: clean.labels, c: clean.colors }),
	);
}

export function decodeWheel(token: string): WheelConfig | null {
	if (!token || token.length > MAX_WHEEL_HASH) {
		return null;
	}
	try {
		const parsed = JSON.parse(fromBase64Url(token)) as {
			v?: unknown;
			l?: unknown;
			c?: unknown;
		};
		if (
			parsed?.v !== 1 ||
			!Array.isArray(parsed.l) ||
			!Array.isArray(parsed.c)
		) {
			return null;
		}
		const labels = parsed.l.filter(
			(value): value is string => typeof value === "string",
		);
		const colors = parsed.c.filter(
			(value): value is string => typeof value === "string",
		);
		const clean = cleanWheelConfig({ labels, colors });
		return clean.labels.length ? clean : null;
	} catch {
		return null;
	}
}

export function shuffled<T>(items: readonly T[], random: () => number): T[] {
	const out = [...items];
	for (let index = out.length - 1; index > 0; index -= 1) {
		const swap = pickIndex(index + 1, random());
		const current = out[index];
		const other = out[swap];
		if (current === undefined || other === undefined) {
			continue;
		}
		out[index] = other;
		out[swap] = current;
	}
	return out;
}