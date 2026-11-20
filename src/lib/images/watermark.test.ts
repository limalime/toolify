import { describe, expect, it } from "vitest";
import { anchorPosition, markScale } from "./watermark";

describe("watermark geometry", () => {
	it("anchors all nine grid positions", () => {
		expect(anchorPosition(0, 1000, 800, 100, 50)).toEqual({ x: 32, y: 32 });
		expect(anchorPosition(4, 1000, 800, 100, 50)).toEqual({ x: 450, y: 375 });
		expect(anchorPosition(8, 1000, 800, 100, 50)).toEqual({ x: 868, y: 718 });
	});

	it("never leaves the base", () => {
		expect(anchorPosition(8, 100, 100, 200, 200)).toEqual({ x: 0, y: 0 });
	});

	it("scales big marks down and keeps small ones", () => {
		expect(markScale(1000, 500, 800)).toEqual({ width: 320, height: 160 });
		expect(markScale(100, 50, 800)).toEqual({ width: 100, height: 50 });
	});
});
