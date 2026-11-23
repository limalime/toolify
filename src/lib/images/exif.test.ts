import { describe, expect, it } from "vitest";
import { parseExif } from "./exif";

function buildJpegWithExif(): ArrayBuffer {
	// minimal little endian tiff block with ifd0 plus one exif entry
	const make = "Toolify\0";
	const model = "Cam 1\0";
	const ifd0Offset = 8;
	const ifd0Size = 2 + 4 * 12 + 4;
	const makeOffset = ifd0Offset + ifd0Size;
	const modelOffset = makeOffset + make.length;
	const exifOffset = modelOffset + model.length;
	const exifSize = 2 + 12 + 4;
	const tiff = new Uint8Array(exifOffset + exifSize);
	const view = new DataView(tiff.buffer);
	const ascii = (text: string, at: number) => {
		for (let index = 0; index < text.length; index += 1) {
			view.setUint8(at + index, text.charCodeAt(index));
		}
	};
	view.setUint16(0, 0x4949, true);
	view.setUint16(2, 42, true);
	view.setUint32(4, ifd0Offset, true);
	view.setUint16(ifd0Offset, 4, true);
	const entry = (index: number, tag: number, type: number, count: number, value: number) => {
		const at = ifd0Offset + 2 + index * 12;
		view.setUint16(at, tag, true);
		view.setUint16(at + 2, type, true);
		view.setUint32(at + 4, count, true);
		if (type === 3 && count === 1) {
			view.setUint16(at + 8, value, true);
		} else {
			view.setUint32(at + 8, value, true);
		}
	};
	entry(0, 0x010f, 2, make.length, makeOffset);
	entry(1, 0x0110, 2, model.length, modelOffset);
	entry(2, 0x0112, 3, 1, 6);
	entry(3, 0x8769, 4, 1, exifOffset);
	view.setUint32(ifd0Offset + 2 + 4 * 12, 0, true);
	ascii(make, makeOffset);
	ascii(model, modelOffset);
	view.setUint16(exifOffset, 1, true);
	const exifEntry = exifOffset + 2;
	view.setUint16(exifEntry, 0x8827, true);
	view.setUint16(exifEntry + 2, 3, true);
	view.setUint32(exifEntry + 4, 1, true);
	view.setUint16(exifEntry + 8, 400, true);
	view.setUint32(exifOffset + 2 + 12, 0, true);

	const exifHeader = "Exif\0\0";
	const app1Length = 2 + exifHeader.length + tiff.length;
	const jpeg = new Uint8Array(2 + 2 + app1Length + 2);
	const out = new DataView(jpeg.buffer);
	let offset = 0;
	out.setUint16(offset, 0xffd8);
	offset += 2;
	out.setUint8(offset, 0xff);
	out.setUint8(offset + 1, 0xe1);
	out.setUint16(offset + 2, app1Length);
	offset += 4;
	for (let index = 0; index < exifHeader.length; index += 1) {
		out.setUint8(offset + index, exifHeader.charCodeAt(index));
	}
	offset += exifHeader.length;
	jpeg.set(tiff, offset);
	return jpeg.buffer;
}

describe("exif reader", () => {
	it("reads make, model, orientation and iso", () => {
		const entries = parseExif(buildJpegWithExif());
		const map = Object.fromEntries(entries.map((entry) => [entry.tag, entry.value]));
		expect(map.Make).toBe("Toolify");
		expect(map.Model).toBe("Cam 1");
		expect(map.Orientation).toBe("Rotate 90 clockwise");
		expect(map.ISO).toBe("400");
	});

	it("returns nothing for a png or junk", () => {
		const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
		expect(parseExif(png.buffer)).toEqual([]);
		expect(parseExif(new ArrayBuffer(0))).toEqual([]);
	});
});