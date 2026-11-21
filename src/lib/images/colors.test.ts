import { describe, expect, it } from "vitest";
import { distinctColors } from "./colors";

describe("color counting", () => {
	it("counts flat colors", () => {
		const data = new Uint8ClampedArray(100 * 4);
		for (let index = 0; index < 100; index++) {
			data[index * 4] = index < 50 ? 27 : 255;
			data[index * 4 + 1] = index < 50 ? 86 : 255;
			data[index * 4 + 2] = index < 50 ? 253 : 255;
			data[index * 4 + 3] = 255;
		}
		expect(distinctColors(data, 1500)).toBe(2);
	});

	it("counts gradients as many", () => {
		const data = new Uint8ClampedArray(400 * 300 * 4);
		let seed = 42;
		for (let index = 0; index < 400 * 300; index++) {
			seed = (seed * 1103515245 + 12345) & 0x7fffffff;
			data[index * 4] = seed % 256;
			data[index * 4 + 1] = (seed >> 8) % 256;
			data[index * 4 + 2] = (seed >> 16) % 256;
			data[index * 4 + 3] = 255;
		}
		expect(distinctColors(data, 400)).toBe(400);
	});

	it("stops early at the cap", () => {
		const data = new Uint8ClampedArray(10_000 * 4);
		for (let index = 0; index < 10_000; index++) {
			data[index * 4] = index % 256;
			data[index * 4 + 1] = (index >> 2) % 256;
			data[index * 4 + 2] = (index >> 4) % 256;
			data[index * 4 + 3] = 255;
		}
		expect(distinctColors(data, 10)).toBe(10);
	});
});
