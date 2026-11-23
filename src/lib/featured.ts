export interface FeaturedPoolEntry {
	slug: string;
	image: string;
	tone: "sand" | "rose" | "mint" | "sky" | "lilac" | "peach";
}

// tools with a generated local screenshot. the weekly pick samples from
// this list, so every card always has a real preview behind it.
export const FEATURED_POOL: FeaturedPoolEntry[] = [
	{ slug: "spin-wheel", image: "/featured/spin-wheel.jpg", tone: "sky" },
	{
		slug: "instagram-generator",
		image: "/featured/instagram-generator.jpg",
		tone: "rose",
	},
	{
		slug: "whatsapp-generator",
		image: "/featured/whatsapp-generator.jpg",
		tone: "mint",
	},
	{ slug: "meme-generator", image: "/featured/meme-generator.jpg", tone: "sand" },
	{ slug: "online-notes", image: "/featured/online-notes.jpg", tone: "peach" },
	{
		slug: "qr-code-generator",
		image: "/featured/qr-code-generator.jpg",
		tone: "lilac",
	},
	{ slug: "color-palette", image: "/featured/color-palette.jpg", tone: "mint" },
	{ slug: "calculator", image: "/featured/calculator.jpg", tone: "sand" },
	{ slug: "ascii-art", image: "/featured/ascii-art.jpg", tone: "sky" },
];

export const FEATURED_COUNT = 3;
export const FEATURED_STORAGE_KEY = "toolify.featured.v1";
export const FEATURED_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface FeaturedCache {
	week: number;
	seed: number;
	picks: string[];
}

export function weekOf(now: number): number {
	return Math.floor(now / FEATURED_WEEK_MS);
}

// small deterministic prng, good enough for a weekly menu rotation.
export function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// partial fisher yates, so no tool can appear twice in one week.
export function sampleTools<T>(pool: T[], seed: number, count: number): T[] {
	if (count <= 0) {
		return [];
	}
	const random = mulberry32(seed);
	const copy = [...pool];
	const total = Math.min(count, copy.length);
	for (let index = 0; index < total; index += 1) {
		const target = index + Math.floor(random() * (copy.length - index));
		[copy[index], copy[target]] = [copy[target] as T, copy[index] as T];
	}
	return copy.slice(0, total);
}

export function parseFeaturedCache(
	raw: string | null,
	week: number,
	poolSlugs: string[],
): FeaturedCache | null {
	if (!raw) {
		return null;
	}
	try {
		const value = JSON.parse(raw) as Partial<FeaturedCache> | null;
		if (!value || typeof value !== "object") {
			return null;
		}
		const { seed, picks } = value;
		if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0) {
			return null;
		}
		if (!Array.isArray(picks) || picks.length !== FEATURED_COUNT) {
			return null;
		}
		const unique = new Set(picks);
		if (unique.size !== picks.length) {
			return null;
		}
		if (!picks.every((slug) => typeof slug === "string" && poolSlugs.includes(slug))) {
			return null;
		}
		if (value.week !== week) {
			return null;
		}
		return { week, seed, picks: picks as string[] };
	} catch {
		return null;
	}
}
