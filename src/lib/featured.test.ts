import { describe, expect, it } from "vitest";
import {
	FEATURED_COUNT,
	FEATURED_POOL,
	mulberry32,
	parseFeaturedCache,
	sampleTools,
	weekOf,
} from "./featured";

const slugs = FEATURED_POOL.map((entry) => entry.slug);

describe("featured tools", () => {
	it("samples three distinct tools", () => {
		for (let seed = 0; seed < 40; seed += 1) {
			const picks = sampleTools(FEATURED_POOL, seed, FEATURED_COUNT);
			expect(picks).toHaveLength(FEATURED_COUNT);
			expect(new Set(picks.map((entry) => entry.slug)).size).toBe(
				FEATURED_COUNT,
			);
		}
	});

	it("is stable for one seed and changes across seeds", () => {
		const a = sampleTools(slugs, 123, 3);
		const b = sampleTools(slugs, 123, 3);
		expect(a).toEqual(b);
		const seen = new Set<string>();
		for (let seed = 0; seed < 30; seed += 1) {
			seen.add(sampleTools(slugs, seed, 3).join(","));
		}
		expect(seen.size).toBeGreaterThan(5);
	});

	it("keeps the prng in range", () => {
		const random = mulberry32(42);
		for (let index = 0; index < 200; index += 1) {
			const value = random();
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
		}
	});

	it("uses whole week buckets", () => {
		const now = Date.UTC(2026, 10, 16, 9);
		expect(weekOf(now)).toBe(weekOf(now + 60 * 60 * 1000));
		expect(weekOf(now)).not.toBe(weekOf(now + 7 * 24 * 60 * 60 * 1000));
	});

	it("accepts only a complete cache for the current week", () => {
		const week = 2950;
		const good = JSON.stringify({ week, seed: 7, picks: slugs.slice(0, 3) });
		expect(parseFeaturedCache(good, week, slugs)?.picks).toEqual(
			slugs.slice(0, 3),
		);
		expect(parseFeaturedCache(good, week + 1, slugs)).toBeNull();
		expect(parseFeaturedCache(null, week, slugs)).toBeNull();
		expect(parseFeaturedCache("nope", week, slugs)).toBeNull();
		expect(
			parseFeaturedCache(
				JSON.stringify({ week, seed: 7, picks: [slugs[0], slugs[0], slugs[1]] }),
				week,
				slugs,
			),
		).toBeNull();
		expect(
			parseFeaturedCache(
				JSON.stringify({
					week,
					seed: 7,
					picks: [slugs[0], slugs[1], "missing"],
				}),
				week,
				slugs,
			),
		).toBeNull();
		expect(
			parseFeaturedCache(
				JSON.stringify({ week, seed: -1, picks: slugs.slice(0, 3) }),
				week,
				slugs,
			),
		).toBeNull();
	});
});
