import { describe, expect, it } from "vitest";
import { needsBackground, OUTPUT_META, stemOf, usesQuality } from "./formats";
import { buildIco, parseIco, pickPngEntry } from "./ico";
import { parseTargetSize } from "./size";
import { embedRasterSvg, ensureSvgSize, svgSize } from "./svg";
import { unzipFiles, zipFiles } from "./zip";

function sampleIco(): Uint8Array {
	const png = new Uint8Array([
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
	]);
	return buildIco(png, 32);
}

describe("ico", () => {
	it("round trips through parse and pick", () => {
		const entries = parseIco(sampleIco());
		expect(entries).toHaveLength(1);
		expect(entries[0]?.width).toBe(32);
		expect(entries[0]?.png).toBe(true);
		expect(pickPngEntry(entries).width).toBe(32);
	});

	it("encodes 256 as zero per the format", () => {
		const entries = parseIco(
			buildIco(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]), 256),
		);
		expect(entries[0]?.width).toBe(256);
	});

	it("rejects malformed files and bmp only icons", () => {
		expect(() => parseIco(new Uint8Array([1, 2, 3]))).toThrow();
		expect(() => parseIco(new Uint8Array(22).fill(7))).toThrow();
		expect(() =>
			pickPngEntry([
				{ width: 16, height: 16, bytes: new Uint8Array(4), png: false },
			]),
		).toThrow();
	});
});

describe("svg", () => {
	it("reads dimensions from attributes or viewBox", () => {
		expect(svgSize('<svg width="100" height="50"></svg>')).toEqual({
			width: 100,
			height: 50,
		});
		expect(svgSize('<svg viewBox="0 0 640 480"></svg>')).toEqual({
			width: 640,
			height: 480,
		});
		expect(svgSize("<svg></svg>")).toBeNull();
		expect(svgSize("<svg width='nope'></svg>")).toBeNull();
	});

	it("stamps missing dimensions without touching present ones", () => {
		expect(
			ensureSvgSize('<svg viewBox="0 0 4 2"></svg>', { width: 4, height: 2 }),
		).toContain('width="4"');
		const kept = ensureSvgSize('<svg width="9" height="9"></svg>', {
			width: 4,
			height: 2,
		});
		expect(kept).toContain('width="9"');
	});

	it("embeds a raster as a standalone document", () => {
		const markup = embedRasterSvg("data:image/jpeg;base64,AAA", 10, 20);
		expect(markup).toContain("<svg");
		expect(markup).toContain('width="10"');
		expect(markup).toContain("data:image/jpeg;base64,AAA");
	});
});

describe("formats", () => {
	it("knows which outputs need background and quality", () => {
		expect(needsBackground("jpg")).toBe(true);
		expect(needsBackground("ico")).toBe(true);
		expect(needsBackground("png")).toBe(false);
		expect(needsBackground("webp")).toBe(false);
		expect(usesQuality("avif")).toBe(true);
		expect(usesQuality("png")).toBe(false);
		expect(usesQuality("ico")).toBe(false);
	});

	it("maps every output to an extension and mime", () => {
		for (const format of Object.keys(OUTPUT_META)) {
			const meta = OUTPUT_META[format as keyof typeof OUTPUT_META];
			expect(meta.extension.length).toBeGreaterThan(1);
			expect(meta.mime).toContain("/");
		}
	});

	it("stems filenames for outputs", () => {
		expect(stemOf("photo.png")).toBe("photo");
		expect(stemOf("archive.tar.png")).toBe("archive.tar");
		expect(stemOf("noext")).toBe("noext");
	});
});

describe("target size", () => {
	it("parses units with or without a space", () => {
		expect(parseTargetSize("500 KB")).toBe(500 * 1024);
		expect(parseTargetSize("1.5MB")).toBe(Math.floor(1.5 * 1024 * 1024));
		expect(parseTargetSize("2 gb")).toBe(2 * 1024 ** 3);
		expect(parseTargetSize("900")).toBe(900 * 1024);
	});

	it("rejects nonsense", () => {
		expect(parseTargetSize("")).toBeNull();
		expect(parseTargetSize("big")).toBeNull();
		expect(parseTargetSize("-5 MB")).toBeNull();
		expect(parseTargetSize("0 KB")).toBeNull();
	});
});

describe("zip", () => {
	it("round trips every entry byte for byte", () => {
		const first = new Uint8Array([1, 2, 3, 4]);
		const second = new Uint8Array([9, 8, 7, 6, 5]);
		const back = unzipFiles(
			zipFiles([
				{ name: "a.png", bytes: first },
				{ name: "b.jpg", bytes: second },
			]),
		);
		expect(back["a.png"]).toEqual(first);
		expect(back["b.jpg"]).toEqual(second);
	});
});
