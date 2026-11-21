// tiling for the upscale model. tiles overlap so edge artifacts get
// cropped away, each tile maps to an exact output rectangle.

export interface Tile {
	x: number;
	y: number;
	width: number;
	height: number;
	outX: number;
	outY: number;
	outWidth: number;
	outHeight: number;
}

export function tileGrid(
	width: number,
	height: number,
	tile: number,
	overlap: number,
	scale: number,
): Tile[] {
	const step = Math.max(1, tile - overlap);
	const tiles: Tile[] = [];
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const keepWidth = Math.min(tile, width - x);
			const keepHeight = Math.min(tile, height - y);
			const left = x === 0 ? 0 : overlap / 2;
			const top = y === 0 ? 0 : overlap / 2;
			const right = x + keepWidth >= width ? 0 : overlap / 2;
			const bottom = y + keepHeight >= height ? 0 : overlap / 2;
			tiles.push({
				x,
				y,
				width: keepWidth,
				height: keepHeight,
				outX: Math.round((x + left) * scale),
				outY: Math.round((y + top) * scale),
				outWidth: Math.round((keepWidth - left - right) * scale),
				outHeight: Math.round((keepHeight - top - bottom) * scale),
			});
		}
	}
	return tiles;
}
