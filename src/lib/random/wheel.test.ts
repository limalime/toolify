import { describe, expect, it } from "vitest";
import {
	decodeWheel,
	encodeWheel,
	MAX_WHEEL_LABELS,
	normalizeRotation,
	pickIndex,
	rotationFor,
	segmentAt,
	shuffled,
	wheelSegments,
} from "./wheel";

describe("spin wheel", () => {
	it("splits even segments clockwise from the top", () => {
		const segments = wheelSegments(["A", "B", "C", "D"]);
		expect(segments).toHaveLength(4);
		expect(segments[0]?.mid).toBeCloseTo(Math.PI / 4);
		expect(segments[3]?.end).toBeCloseTo(Math.PI * 2);
	});

	it("picks an index inside the list", () => {
		expect(pickIndex(4, 0)).toBe(0);
		expect(pickIndex(4, 0.999)).toBe(3);
		expect(pickIndex(4, 1)).toBe(3);
		expect(pickIndex(0, 0.5)).toBe(-1);
	});

	it("maps a rotation back to the landed segment", () => {
		for (let index = 0; index < 6; index += 1) {
			const rotation = rotationFor(index, 6, 4);
			expect(segmentAt(rotation, 6)).toBe(index);
		}
	});

	it("normalizes negative rotations", () => {
		expect(normalizeRotation(-1)).toBeCloseTo(Math.PI * 2 - 1);
		expect(normalizeRotation(Math.PI * 2 * 3)).toBe(0);
	});

	it("shuffles without mutating the source", () => {
		const source = ["A", "B", "C", "D"];
		expect(shuffled(source, () => 0)).toEqual(["B", "C", "D", "A"]);
		expect(source).toEqual(["A", "B", "C", "D"]);
	});

	it("roundtrips labels and colors through a share token", () => {
		const token = encodeWheel({
			labels: ["Pizza", "Sushi", "Nasi goreng"],
			colors: ["#1b56fd", "#ffb020"],
		});
		expect(token).not.toContain("=");
		expect(decodeWheel(token)).toEqual({
			labels: ["Pizza", "Sushi", "Nasi goreng"],
			colors: ["#1b56fd", "#ffb020"],
		});
	});

	it("cleans bad share payloads instead of trusting them", () => {
		const token = encodeWheel({
			labels: ["  A  ", "", "B", ...Array.from({ length: 30 }, (_, i) => `L${i}`)],
			colors: ["#123456", "red", "#abcdef"],
		});
		const decoded = decodeWheel(token);
		expect(decoded?.labels).toHaveLength(MAX_WHEEL_LABELS);
		expect(decoded?.labels.slice(0, 2)).toEqual(["A", "B"]);
		expect(decoded?.colors).toEqual(["#123456", "#abcdef"]);
	});

	it("rejects garbage share tokens", () => {
		expect(decodeWheel("")).toBeNull();
		expect(decodeWheel("!!!")).toBeNull();
		expect(decodeWheel("e30")).toBeNull();
		expect(decodeWheel("x".repeat(3000))).toBeNull();
	});
});