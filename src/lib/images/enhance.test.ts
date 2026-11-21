import { describe, expect, it } from "vitest";
import {
	adjustPixel,
	clampByte,
	contrastFactor,
	NEUTRAL_ENHANCE,
	sharpenPlane,
} from "./enhance";

describe("enhance math", () => {
	it("leaves pixels untouched at neutral", () => {
		expect(adjustPixel(12, 128, 250, NEUTRAL_ENHANCE)).toEqual([12, 128, 250]);
	});

	it("shifts brightness across channels", () => {
		const [red, green, blue] = adjustPixel(100, 100, 100, {
			...NEUTRAL_ENHANCE,
			brightness: 10,
		});
		expect(red).toBe(green);
		expect(green).toBe(blue);
		expect(red).toBeGreaterThan(100);
	});

	it("pushes contrast away from mid gray", () => {
		const dark = adjustPixel(60, 60, 60, { ...NEUTRAL_ENHANCE, contrast: 50 });
		const light = adjustPixel(200, 200, 200, {
			...NEUTRAL_ENHANCE,
			contrast: 50,
		});
		expect(dark[0]).toBeLessThan(60);
		expect(light[0]).toBeGreaterThan(200);
	});

	it("drains color at full negative saturation", () => {
		const [red, green, blue] = adjustPixel(200, 50, 50, {
			...NEUTRAL_ENHANCE,
			saturation: -100,
		});
		expect(red).toBe(green);
		expect(green).toBe(blue);
	});

	it("keeps contrast factor at one when neutral", () => {
		expect(contrastFactor(0)).toBeCloseTo(1, 5);
	});

	it("clamps outside bytes", () => {
		expect(clampByte(-3)).toBe(0);
		expect(clampByte(300)).toBe(255);
	});

	it("returns the same buffer at zero sharpness", () => {
		const data = new Uint8ClampedArray([10, 20, 30, 255]);
		expect(sharpenPlane(data, 1, 1, 0)).toBe(data);
	});

	it("lifts isolated bright pixels when sharpening", () => {
		const data = new Uint8ClampedArray(3 * 3 * 4).fill(10);
		data[4 * 4] = 200;
		data[4 * 4 + 1] = 200;
		data[4 * 4 + 2] = 200;
		data[4 * 4 + 3] = 255;
		const out = sharpenPlane(data, 3, 3, 100);
		expect(out[4 * 4]).toBe(255);
	});
});
