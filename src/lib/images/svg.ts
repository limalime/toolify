// svg helpers: read raster dimensions out of markup, wrap a raster
// image in a standalone svg document.

export interface SvgSize {
	width: number;
	height: number;
}

function readLength(value: string | undefined): number | null {
	if (!value) {
		return null;
	}
	const match = value.trim().match(/^(\d+(?:\.\d+)?)(px)?$/);
	if (!match) {
		return null;
	}
	const parsed = Number(match[1]);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// width and height attributes win, viewBox is the fallback. returns
// null when the markup carries no usable size at all.
export function svgSize(markup: string): SvgSize | null {
	const tag = markup.match(/<svg\b[^>]*>/i)?.[0] ?? "";
	const width = readLength(tag.match(/\swidth\s*=\s*["']([^"']+)["']/i)?.[1]);
	const height = readLength(tag.match(/\sheight\s*=\s*["']([^"']+)["']/i)?.[1]);
	if (width && height) {
		return { width: Math.round(width), height: Math.round(height) };
	}
	const box = tag.match(/\sviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
	if (box) {
		const parts = box
			.trim()
			.split(/[\s,]+/)
			.map(Number);
		if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
			const [, , w, h] = parts as [number, number, number, number];
			if (w > 0 && h > 0) {
				return { width: Math.round(w), height: Math.round(h) };
			}
		}
	}
	return null;
}

// stamps explicit dimensions onto svg markup that only has a viewBox,
// so rasterizers that need width and height accept it.
export function ensureSvgSize(markup: string, size: SvgSize): string {
	return markup.replace(/<svg\b([^>]*)>/i, (_tag, attrs: string) => {
		let next = attrs;
		if (!/\swidth\s*=/i.test(next)) {
			next += ` width="${size.width}"`;
		}
		if (!/\sheight\s*=/i.test(next)) {
			next += ` height="${size.height}"`;
		}
		return `<svg${next}>`;
	});
}

// standalone svg document embedding one raster image.
export function embedRasterSvg(
	dataUrl: string,
	width: number,
	height: number,
): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><image href="${dataUrl}" width="${width}" height="${height}"/></svg>`;
}
