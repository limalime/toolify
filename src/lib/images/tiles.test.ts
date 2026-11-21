import { describe, expect, it } from "vitest";
import { tileGrid } from "./tiles";

describe("upscale tiling", () => {
	it("covers small images with one tile", () => {
		const tiles = tileGrid(200, 100, 256, 32, 4);
		expect(tiles).toHaveLength(1);
		expect(tiles[0]).toMatchObject({
			x: 0,
			y: 0,
			width: 200,
			height: 100,
			outX: 0,
			outY: 0,
			outWidth: 800,
			outHeight: 400,
		});
	});

	it("tiles large images with exact output coverage", () => {
		const tiles = tileGrid(512, 512, 256, 32, 4);
		expect(tiles.length).toBeGreaterThan(1);
		const widest = Math.max(...tiles.map((tile) => tile.outX + tile.outWidth));
		const tallest = Math.max(
			...tiles.map((tile) => tile.outY + tile.outHeight),
		);
		expect(widest).toBe(2048);
		expect(tallest).toBe(2048);
		for (const tile of tiles) {
			expect(tile.outWidth).toBeGreaterThan(0);
			expect(tile.outHeight).toBeGreaterThan(0);
		}
	});

	it("keeps every tile inside the image", () => {
		for (const tile of tileGrid(700, 500, 256, 32, 4)) {
			expect(tile.x + tile.width).toBeLessThanOrEqual(700);
			expect(tile.y + tile.height).toBeLessThanOrEqual(500);
		}
	});
});
