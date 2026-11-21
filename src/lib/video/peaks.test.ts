import { describe, expect, it } from "vitest";
import { peaksFromSamples } from "./peaks";
import { formatDuration } from "./probe";

describe("waveform helpers", () => {
	it("formats durations as m:ss", () => {
		expect(formatDuration(0)).toBe("0:00");
		expect(formatDuration(3.2)).toBe("0:03");
		expect(formatDuration(125)).toBe("2:05");
	});

	it("picks peaks per bucket", () => {
		const channel = new Float32Array([0.1, 0.9, 0.2, 0.3]);
		const [first, second] = peaksFromSamples([channel], 2);
		expect(first).toBeCloseTo(0.9, 5);
		expect(second).toBeCloseTo(0.3, 5);
	});

	it("mixes channels by loudest sample", () => {
		const left = new Float32Array([0.1, 0.1]);
		const right = new Float32Array([0.8, 0.1]);
		const [peak] = peaksFromSamples([left, right], 1);
		expect(peak).toBeCloseTo(0.8, 5);
	});

	it("handles empty input", () => {
		expect(peaksFromSamples([], 10)).toEqual([]);
		expect(peaksFromSamples([new Float32Array(0)], 10)).toEqual([]);
	});
});
