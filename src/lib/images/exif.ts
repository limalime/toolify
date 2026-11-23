export interface ExifEntry {
	tag: string;
	value: string;
}

const TAGS: Record<number, string> = {
	0x010e: "ImageDescription",
	0x010f: "Make",
	0x0110: "Model",
	0x0112: "Orientation",
	0x011a: "XResolution",
	0x011b: "YResolution",
	0x0128: "ResolutionUnit",
	0x0131: "Software",
	0x0132: "DateTime",
	0x013b: "Artist",
	0x8298: "Copyright",
	0x8769: "ExifIFD",
	0x8825: "GPSIFD",
};

const EXIF_TAGS: Record<number, string> = {
	0x829a: "ExposureTime",
	0x829d: "FNumber",
	0x8822: "ExposureProgram",
	0x8827: "ISO",
	0x9003: "DateTimeOriginal",
	0x9004: "DateTimeDigitized",
	0x9201: "ShutterSpeedValue",
	0x9202: "ApertureValue",
	0x9204: "ExposureBiasValue",
	0x9207: "MeteringMode",
	0x9209: "Flash",
	0x920a: "FocalLength",
	0x9286: "UserComment",
	0xa002: "PixelXDimension",
	0xa003: "PixelYDimension",
	0xa402: "ExposureMode",
	0xa403: "WhiteBalance",
	0xa434: "LensModel",
};

const GPS_TAGS: Record<number, string> = {
	0x0000: "GPSVersionID",
	0x0001: "GPSLatitudeRef",
	0x0002: "GPSLatitude",
	0x0003: "GPSLongitudeRef",
	0x0004: "GPSLongitude",
	0x0005: "GPSAltitudeRef",
	0x0006: "GPSAltitude",
	0x001d: "GPSDateStamp",
};

const ORIENTATIONS: Record<number, string> = {
	1: "Normal",
	2: "Mirror horizontal",
	3: "Rotate 180",
	4: "Mirror vertical",
	5: "Mirror horizontal and rotate 270",
	6: "Rotate 90 clockwise",
	7: "Mirror horizontal and rotate 90",
	8: "Rotate 270 clockwise",
};

function readAscii(view: DataView, offset: number, count: number): string {
	let text = "";
	for (let index = 0; index < count; index += 1) {
		const code = view.getUint8(offset + index);
		if (code === 0) {
			break;
		}
		text += String.fromCharCode(code);
	}
	return text.trim();
}

function readRational(view: DataView, offset: number, little: boolean): number | null {
	if (offset + 8 > view.byteLength) {
		return null;
	}
	const numerator = view.getUint32(offset, little);
	const denominator = view.getUint32(offset + 4, little);
	if (denominator === 0) {
		return null;
	}
	return numerator / denominator;
}

function readValue(
	view: DataView,
	type: number,
	count: number,
	offset: number,
	little: boolean,
): string | null {
	switch (type) {
		case 1:
			return String(view.getUint8(offset));
		case 2:
			return readAscii(view, offset, count);
		case 3: {
			const values: number[] = [];
			for (let index = 0; index < Math.min(count, 8); index += 1) {
				values.push(view.getUint16(offset + index * 2, little));
			}
			return values.join(", ");
		}
		case 4: {
			const values: number[] = [];
			for (let index = 0; index < Math.min(count, 8); index += 1) {
				values.push(view.getUint32(offset + index * 4, little));
			}
			return values.join(", ");
		}
		case 5:
		case 10: {
			const values: number[] = [];
			for (let index = 0; index < Math.min(count, 8); index += 1) {
				const value = readRational(view, offset + index * 8, little);
				if (value !== null) {
					values.push(value);
				}
			}
			return values.map((value) => String(Number(value.toFixed(4)))).join(", ");
		}
		case 9: {
			if (offset + 4 <= view.byteLength) {
				return String(view.getInt32(offset, little));
			}
			return null;
		}
		default:
			return null;
	}
}

function parseIfd(
	view: DataView,
	ifdOffset: number,
	little: boolean,
	names: Record<number, string>,
	out: Map<string, string>,
): Map<number, number> | null {
	if (ifdOffset + 2 > view.byteLength) {
		return null;
	}
	const count = view.getUint16(ifdOffset, little);
	const pointers = new Map<number, number>();
	for (let index = 0; index < count; index += 1) {
		const entry = ifdOffset + 2 + index * 12;
		if (entry + 12 > view.byteLength) {
			break;
		}
		const tag = view.getUint16(entry, little);
		const type = view.getUint16(entry + 2, little);
		const length = view.getUint32(entry + 4, little);
		const sizes: Record<number, number> = {
			1: 1,
			2: 1,
			3: 2,
			4: 4,
			5: 8,
			9: 4,
			10: 8,
		};
		const size = (sizes[type] ?? 1) * length;
		const valueOffset = size <= 4 ? entry + 8 : view.getUint32(entry + 8, little);
		if (tag === 0x8769 || tag === 0x8825) {
			pointers.set(tag, view.getUint32(entry + 8, little));
			continue;
		}
		const name = names[tag];
		if (!name || valueOffset + size > view.byteLength) {
			continue;
		}
		const value = readValue(view, type, length, valueOffset, little);
		if (value === null || value === "") {
			continue;
		}
		out.set(name, tag === 0x0112 ? (ORIENTATIONS[Number(value)] ?? value) : value);
	}
	return pointers;
}

// reads the first app1 exif block of a jpeg. other formats usually keep
// their metadata in containers we do not parse, so the ui says so.
export function parseExif(bytes: ArrayBuffer): ExifEntry[] {
	const view = new DataView(bytes);
	const out = new Map<string, string>();
	if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) {
		return [];
	}
	let offset = 2;
	while (offset + 4 < view.byteLength) {
		if (view.getUint8(offset) !== 0xff) {
			break;
		}
		const marker = view.getUint8(offset + 1);
		const length = view.getUint16(offset + 2);
		if (length < 2) {
			break;
		}
		if (marker === 0xe1 && offset + 4 + 6 <= view.byteLength) {
			let text = "";
			for (let index = 0; index < 6; index += 1) {
				text += String.fromCharCode(view.getUint8(offset + 4 + index));
			}
			if (text === "Exif\0\0") {
				const tiff = offset + 10;
				if (tiff + 8 > view.byteLength) {
					return [];
				}
				const order = view.getUint16(tiff);
				const little = order === 0x4949;
				if (!little && order !== 0x4d4d) {
					return [];
				}
				const tiffView = new DataView(bytes, tiff);
				const ifd0 = tiffView.getUint32(4, little);
				const pointers = parseIfd(tiffView, ifd0, little, TAGS, out);
				if (pointers) {
					const exifPointer = pointers.get(0x8769);
					if (exifPointer) {
						parseIfd(tiffView, exifPointer, little, EXIF_TAGS, out);
					}
					const gpsPointer = pointers.get(0x8825);
					if (gpsPointer) {
						parseIfd(tiffView, gpsPointer, little, GPS_TAGS, out);
					}
				}
				break;
			}
		}
		offset += 2 + length;
	}
	return [...out.entries()].map(([tag, value]) => ({ tag, value }));
}