import { describe, expect, it } from "vitest";
import {
	containerStructure,
	gifSegments,
	isoBoxes,
	jpegSegments,
	pngChunks,
	probeDimensions,
	tiffSegments,
	webpChunks,
} from "./containers";

function pngBytes(): Uint8Array {
	const bytes = new Uint8Array(8 + 25 + 12);
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
	const view = new DataView(bytes.buffer);
	view.setUint32(8, 13);
	bytes.set([0x49, 0x48, 0x44, 0x52], 12);
	view.setUint32(16, 640);
	view.setUint32(20, 480);
	view.setUint32(33, 0);
	bytes.set([0x49, 0x45, 0x4e, 0x44], 37);
	return bytes;
}

describe("container structure", () => {
	it("lists png chunks with sizes", () => {
		const segments = pngChunks(pngBytes());
		expect(segments).toEqual([
			{ name: "IHDR", bytes: 25, detail: "640 x 480" },
			{ name: "IEND", bytes: 12 },
		]);
		expect(containerStructure(pngBytes())).toHaveLength(2);
	});

	it("lists jpeg markers and keeps entropy data in one row", () => {
		const bytes = new Uint8Array([
			0xff, 0xd8,
			0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
			0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
			0xff, 0xda, 0x00, 0x06, 0x01, 0x01, 0x00, 0x00,
			0x12, 0x34, 0x56,
			0xff, 0xd9,
		]);
		const segments = jpegSegments(bytes);
		expect(segments[0]).toEqual({ name: "SOI", bytes: 2 });
		expect(segments[1]).toMatchObject({ name: "APP0", bytes: 18, detail: "JFIF" });
		expect(segments[2]).toMatchObject({ name: "SOS", bytes: 8 });
		expect(segments[3]).toEqual({ name: "Entropy data", bytes: 3 });
	});

	it("lists webp riff chunks", () => {
		const bytes = new Uint8Array(12 + 8 + 4 + 8);
		bytes.set([0x52, 0x49, 0x46, 0x46]);
		bytes.set([0x57, 0x45, 0x42, 0x50], 8);
		const view = new DataView(bytes.buffer);
		view.setUint32(4, bytes.length - 8, true);
		bytes.set([0x56, 0x50, 0x38, 0x58], 12);
		view.setUint32(16, 4, true);
		bytes.set([0x56, 0x50, 0x38, 0x20], 24);
		view.setUint32(28, 0, true);
		const segments = webpChunks(bytes);
		expect(segments.map((segment) => segment.name)).toEqual([
			"RIFF header",
			"VP8X",
			"VP8 ",
		]);
	});

	it("lists iso boxes for avif", () => {
		const bytes = new Uint8Array(24);
		const view = new DataView(bytes.buffer);
		view.setUint32(0, 24);
		bytes.set([0x66, 0x74, 0x79, 0x70], 4);
		bytes.set([0x61, 0x76, 0x69, 0x66], 8);
		expect(isoBoxes(bytes)).toEqual([{ name: "ftyp", bytes: 24 }]);
	});

	it("returns nothing for unknown bytes", () => {
		expect(containerStructure(new Uint8Array([1, 2, 3, 4]))).toEqual([]);
	});

	it("lists gif blocks and screen size", () => {
		const bytes = new Uint8Array(30);
		bytes.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
		const view = new DataView(bytes.buffer);
		view.setUint16(6, 320, true);
		view.setUint16(8, 200, true);
		bytes[13] = 0x2c;
		view.setUint16(18, 320, true);
		view.setUint16(20, 200, true);
		bytes[23] = 8;
		bytes[24] = 3;
		bytes[25] = 1;
		bytes[26] = 2;
		bytes[27] = 3;
		bytes[28] = 0;
		bytes[29] = 0x3b;
		const segments = gifSegments(bytes);
		expect(segments[0]).toEqual({
			name: "Header",
			bytes: 6,
			detail: "GIF89a",
		});
		expect(segments[1]).toEqual({
			name: "Logical screen",
			bytes: 7,
			detail: "320 x 200",
		});
		expect(segments[2]).toMatchObject({
			name: "Image descriptor",
			detail: "320 x 200",
		});
		expect(segments.at(-1)).toEqual({ name: "Trailer", bytes: 1 });
		expect(probeDimensions(bytes)).toEqual({ width: 320, height: 200 });
	});

	it("lists tiff directories and reads dimensions", () => {
		const bytes = new Uint8Array(38);
		bytes[0] = 0x49;
		bytes[1] = 0x49;
		const view = new DataView(bytes.buffer);
		view.setUint16(2, 42, true);
		view.setUint32(4, 8, true);
		view.setUint16(8, 2, true);
		view.setUint16(10, 256, true);
		view.setUint16(12, 3, true);
		view.setUint32(14, 1, true);
		view.setUint16(18, 640, true);
		view.setUint16(22, 257, true);
		view.setUint16(24, 3, true);
		view.setUint32(26, 1, true);
		view.setUint16(30, 480, true);
		const segments = tiffSegments(bytes);
		expect(segments[0]).toMatchObject({ name: "TIFF header", bytes: 8 });
		expect(segments[1]).toEqual({
			name: "IFD0",
			bytes: 30,
			detail: "2 entries",
		});
		expect(probeDimensions(bytes)).toEqual({ width: 640, height: 480 });
	});

	it("reads avif dimensions from the ispe box", () => {
		const bytes = new Uint8Array(36);
		const view = new DataView(bytes.buffer);
		view.setUint32(0, 16);
		bytes.set([0x66, 0x74, 0x79, 0x70], 4);
		bytes.set([0x61, 0x76, 0x69, 0x66], 8);
		view.setUint32(16, 20);
		bytes.set([0x69, 0x73, 0x70, 0x65], 20);
		view.setUint32(28, 800);
		view.setUint32(32, 600);
		expect(probeDimensions(bytes)).toEqual({ width: 800, height: 600 });
	});

	it("reads png dimensions from the header", () => {
		expect(probeDimensions(pngBytes())).toEqual({ width: 640, height: 480 });
	});
});