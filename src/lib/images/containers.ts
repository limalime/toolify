export interface ContainerSegment {
	name: string;
	bytes: number;
	detail?: string;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function matches(bytes: Uint8Array, head: number[]): boolean {
	return head.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
	let text = "";
	for (let index = 0; index < length; index += 1) {
		const code = bytes[start + index];
		if (code === undefined) {
			break;
		}
		text += String.fromCharCode(code);
	}
	return text;
}

export function pngChunks(bytes: Uint8Array): ContainerSegment[] {
	if (!matches(bytes, PNG_SIGNATURE)) {
		return [];
	}
	const segments: ContainerSegment[] = [];
	let offset = 8;
	while (offset + 12 <= bytes.length) {
		const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
		const length = view.getUint32(0);
		const name = ascii(bytes, offset + 4, 4);
		const total = length + 12;
		if (length > bytes.length - offset - 12) {
			segments.push({ name: `${name} (truncated)`, bytes: bytes.length - offset });
			break;
		}
		let detail: string | undefined;
		if (name === "IHDR" && length >= 8) {
			const header = new DataView(
				bytes.buffer,
				bytes.byteOffset + offset + 8,
				8,
			);
			detail = `${header.getUint32(0)} x ${header.getUint32(4)}`;
		}
		segments.push({ name, bytes: total, ...(detail ? { detail } : {}) });
		offset += total;
		if (name === "IEND") {
			break;
		}
	}
	if (offset < bytes.length) {
		segments.push({ name: "Trailing bytes", bytes: bytes.length - offset });
	}
	return segments;
}

const JPEG_NAMES: Record<number, string> = {
	0xc0: "SOF0 baseline",
	0xc1: "SOF1",
	0xc2: "SOF2 progressive",
	0xc4: "DHT",
	0xd8: "SOI",
	0xd9: "EOI",
	0xda: "SOS",
	0xdb: "DQT",
	0xdd: "DRI",
	0xe0: "APP0",
	0xe1: "APP1",
	0xe2: "APP2",
	0xed: "APP13",
	0xee: "APP14",
	0xfe: "COM",
};

export function jpegSegments(bytes: Uint8Array): ContainerSegment[] {
	if (!matches(bytes, [0xff, 0xd8])) {
		return [];
	}
	const segments: ContainerSegment[] = [{ name: "SOI", bytes: 2 }];
	let offset = 2;
	while (offset + 4 <= bytes.length) {
		if (bytes[offset] !== 0xff) {
			break;
		}
		const marker = bytes[offset + 1] ?? 0;
		if (marker === 0xd9) {
			segments.push({ name: "EOI", bytes: 2 });
			offset += 2;
			break;
		}
		if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
			segments.push({ name: JPEG_NAMES[marker] ?? "Marker", bytes: 2 });
			offset += 2;
			continue;
		}
		const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 2, 2);
		const length = view.getUint16(0);
		if (length < 2) {
			break;
		}
		const name = JPEG_NAMES[marker] ?? `0x${marker.toString(16)}`;
		let detail: string | undefined;
		if (marker >= 0xc0 && marker <= 0xc3 && offset + 9 < bytes.length) {
			const header = new DataView(
				bytes.buffer,
				bytes.byteOffset + offset + 5,
				4,
			);
			detail = `${header.getUint16(2)} x ${header.getUint16(0)}`;
		}
		if (marker === 0xe0) {
			const tag = ascii(bytes, offset + 4, 5);
			if (tag.startsWith("JFIF")) {
				detail = "JFIF";
			}
		}
		if (marker === 0xe1) {
			const tag = ascii(bytes, offset + 4, 6);
			if (tag.startsWith("Exif")) {
				detail = "Exif";
			}
		}
		segments.push({
			name,
			bytes: length + 2,
			...(detail ? { detail } : {}),
		});
		offset += length + 2;
		if (marker === 0xda) {
			let end = bytes.length - offset;
			if (
				end >= 2 &&
				bytes[bytes.length - 2] === 0xff &&
				bytes[bytes.length - 1] === 0xd9
			) {
				segments.push({ name: "Entropy data", bytes: end - 2 });
				segments.push({ name: "EOI", bytes: 2 });
				end = 0;
			} else if (end > 0) {
				segments.push({ name: "Entropy data", bytes: end });
			}
			offset = bytes.length;
			break;
		}
	}
	if (offset < bytes.length && segments[segments.length - 1]?.name !== "Entropy data") {
		segments.push({ name: "Trailing bytes", bytes: bytes.length - offset });
	}
	return segments;
}

export function webpChunks(bytes: Uint8Array): ContainerSegment[] {
	if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
		return [];
	}
	const segments: ContainerSegment[] = [{ name: "RIFF header", bytes: 12 }];
	let offset = 12;
	while (offset + 8 <= bytes.length) {
		const name = ascii(bytes, offset, 4);
		const view = new DataView(bytes.buffer, bytes.byteOffset + offset + 4, 4);
		const length = view.getUint32(0, true);
		const total = 8 + length + (length % 2);
		segments.push({ name, bytes: Math.min(total, bytes.length - offset) });
		offset += total;
	}
	if (offset < bytes.length) {
		segments.push({ name: "Trailing bytes", bytes: bytes.length - offset });
	}
	return segments;
}

const ISO_BRANDS = ["ftyp", "avif", "avis", "heic", "heix", "mif1", "msf1"];

export function isoBoxes(bytes: Uint8Array): ContainerSegment[] {
	const brand = ascii(bytes, 4, 4);
	if (!ISO_BRANDS.includes(brand)) {
		return [];
	}
	const segments: ContainerSegment[] = [];
	let offset = 0;
	while (offset + 8 <= bytes.length) {
		const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
		let size = view.getUint32(0);
		const name = ascii(bytes, offset + 4, 4);
		if (size === 0) {
			size = bytes.length - offset;
		} else if (size === 1) {
			if (offset + 16 > bytes.length) {
				break;
			}
			const large = new DataView(
				bytes.buffer,
				bytes.byteOffset + offset + 8,
				8,
			);
			size = Number(large.getBigUint64(0));
		}
		if (size < 8 || size > bytes.length - offset) {
			segments.push({
				name: `${name} (truncated)`,
				bytes: bytes.length - offset,
			});
			break;
		}
		segments.push({ name, bytes: size });
		offset += size;
	}
	if (offset < bytes.length) {
		segments.push({ name: "Trailing bytes", bytes: bytes.length - offset });
	}
	return segments;
}

// reads only the leading part of a file, so huge photos stay cheap.
export function containerStructure(bytes: Uint8Array): ContainerSegment[] {
	return [
		...pngChunks(bytes),
		...jpegSegments(bytes),
		...webpChunks(bytes),
		...isoBoxes(bytes),
		...gifSegments(bytes),
		...tiffSegments(bytes),
	];
}

export interface ImageSize {
	width: number;
	height: number;
}

function viewOf(bytes: Uint8Array): DataView {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

const GIF_SIGNATURES = ["GIF87a", "GIF89a"];

function gifBlocks(
	bytes: Uint8Array,
	view: DataView,
	start: number,
): ContainerSegment[] {
	const segments: ContainerSegment[] = [];
	let offset = start;
	while (offset < bytes.length) {
		const marker = bytes[offset] ?? 0;
		if (marker === 0x3b) {
			segments.push({ name: "Trailer", bytes: 1 });
			break;
		}
		if (marker === 0x2c) {
			if (offset + 10 > bytes.length) {
				segments.push({
					name: "Image descriptor (truncated)",
					bytes: bytes.length - offset,
				});
				break;
			}
			const packed = bytes[offset + 9] ?? 0;
			const width = view.getUint16(offset + 5, true);
			const height = view.getUint16(offset + 7, true);
			segments.push({
				name: "Image descriptor",
				bytes: 10,
				detail: `${width} x ${height}`,
			});
			offset += 10;
			if (packed & 0x80) {
				const entries = 2 ** ((packed & 0x07) + 1);
				const size = entries * 3;
				segments.push({
					name: "Local color table",
					bytes: Math.min(size, bytes.length - offset),
					detail: `${entries} colors`,
				});
				offset += size;
			}
			const start = offset;
			offset += 1;
			while (offset < bytes.length) {
				const size = bytes[offset] ?? 0;
				offset += 1;
				if (size === 0) {
					break;
				}
				offset += Math.min(size, bytes.length - offset);
			}
			segments.push({
				name: "Image data",
				bytes: Math.min(offset, bytes.length) - start,
			});
			continue;
		}
		if (marker === 0x21) {
			const start = offset;
			offset += 2;
			while (offset < bytes.length) {
				const size = bytes[offset] ?? 0;
				offset += 1;
				if (size === 0) {
					break;
				}
				offset += Math.min(size, bytes.length - offset);
			}
			segments.push({
				name: "Extension",
				bytes: Math.min(offset, bytes.length) - start,
			});
			continue;
		}
		segments.push({
			name: `Block 0x${marker.toString(16)}`,
			bytes: bytes.length - offset,
		});
		break;
	}
	return segments;
}

export function gifSegments(bytes: Uint8Array): ContainerSegment[] {
	const signature = ascii(bytes, 0, 6);
	if (!GIF_SIGNATURES.includes(signature) || bytes.length < 13) {
		return [];
	}
	const view = viewOf(bytes);
	const width = view.getUint16(6, true);
	const height = view.getUint16(8, true);
	const packed = bytes[10] ?? 0;
	const segments: ContainerSegment[] = [
		{ name: "Header", bytes: 6, detail: signature },
		{ name: "Logical screen", bytes: 7, detail: `${width} x ${height}` },
	];
	let offset = 13;
	if (packed & 0x80) {
		const entries = 2 ** ((packed & 0x07) + 1);
		const size = entries * 3;
		segments.push({
			name: "Global color table",
			bytes: Math.min(size, bytes.length - offset),
			detail: `${entries} colors`,
		});
		offset += size;
	}
	return [...segments, ...gifBlocks(bytes, view, offset)];
}

const TIFF_TYPE_SIZES: Record<number, number> = {
	1: 1,
	2: 1,
	3: 2,
	4: 4,
	5: 8,
	6: 1,
	7: 1,
	8: 2,
	9: 4,
	10: 8,
	11: 4,
	12: 8,
};

function tiffEndian(bytes: Uint8Array): boolean | null {
	if (bytes.length < 8) {
		return null;
	}
	if (bytes[0] === 0x49 && bytes[1] === 0x49) {
		return true;
	}
	if (bytes[0] === 0x4d && bytes[1] === 0x4d) {
		return false;
	}
	return null;
}

function tiffEntry(
	bytes: Uint8Array,
	view: DataView,
	little: boolean,
	entryOffset: number,
): number | null {
	const type = view.getUint16(entryOffset + 2, little);
	const count = view.getUint32(entryOffset + 4, little);
	const size = TIFF_TYPE_SIZES[type];
	if (!size || count === 0) {
		return null;
	}
	let at = entryOffset + 8;
	if (size * count > 4) {
		const offset = view.getUint32(entryOffset + 8, little);
		if (offset + size > bytes.length) {
			return null;
		}
		at = offset;
	}
	if (type === 3) {
		return view.getUint16(at, little);
	}
	if (type === 4) {
		return view.getUint32(at, little);
	}
	if (type === 1) {
		return bytes[at] ?? null;
	}
	return null;
}

function tiffSize(bytes: Uint8Array): ImageSize | null {
	const little = tiffEndian(bytes);
	if (little === null) {
		return null;
	}
	const view = viewOf(bytes);
	if (view.getUint16(2, little) !== 42) {
		return null;
	}
	const first = view.getUint32(4, little);
	if (first + 2 > bytes.length) {
		return null;
	}
	const count = view.getUint16(first, little);
	let width = 0;
	let height = 0;
	for (let index = 0; index < count; index += 1) {
		const entry = first + 2 + index * 12;
		if (entry + 12 > bytes.length) {
			break;
		}
		const tag = view.getUint16(entry, little);
		if (tag !== 256 && tag !== 257) {
			continue;
		}
		const value = tiffEntry(bytes, view, little, entry);
		if (value === null) {
			continue;
		}
		if (tag === 256) {
			width = value;
		} else {
			height = value;
		}
	}
	return width > 0 && height > 0 ? { width, height } : null;
}

export function tiffSegments(bytes: Uint8Array): ContainerSegment[] {
	const little = tiffEndian(bytes);
	if (little === null) {
		return [];
	}
	const view = viewOf(bytes);
	if (view.getUint16(2, little) !== 42) {
		return [];
	}
	let offset = view.getUint32(4, little);
	if (offset < 8 || offset >= bytes.length) {
		return [];
	}
	const segments: ContainerSegment[] = [
		{
			name: "TIFF header",
			bytes: 8,
			detail: little ? "little endian" : "big endian",
		},
	];
	if (offset > 8) {
		segments.push({ name: "Image data", bytes: offset - 8 });
	}
	let seen = 0;
	while (offset + 2 <= bytes.length && seen < 8) {
		const count = view.getUint16(offset, little);
		const total = 2 + count * 12 + 4;
		if (offset + total > bytes.length) {
			segments.push({
				name: "IFD (truncated)",
				bytes: bytes.length - offset,
			});
			break;
		}
		segments.push({
			name: seen === 0 ? "IFD0" : `IFD${seen}`,
			bytes: total,
			detail: `${count} entries`,
		});
		const next = view.getUint32(offset + 2 + count * 12, little);
		offset += total;
		if (!next || next <= offset || next >= bytes.length) {
			break;
		}
		segments.push({ name: "Image data", bytes: next - offset });
		offset = next;
		seen += 1;
	}
	if (offset < bytes.length) {
		segments.push({ name: "Trailing data", bytes: bytes.length - offset });
	}
	return segments;
}

function jpegSize(bytes: Uint8Array, view: DataView): ImageSize | null {
	let offset = 2;
	while (offset + 9 < bytes.length) {
		if (bytes[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = bytes[offset + 1] ?? 0;
		if (
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc
		) {
			return {
				width: view.getUint16(offset + 7),
				height: view.getUint16(offset + 5),
			};
		}
		if (marker === 0xd9 || marker === 0xda) {
			break;
		}
		const length = view.getUint16(offset + 2);
		if (length < 2) {
			break;
		}
		offset += 2 + length;
	}
	return null;
}

function webpSize(bytes: Uint8Array, view: DataView): ImageSize | null {
	const chunk = ascii(bytes, 12, 4);
	if (chunk === "VP8X" && bytes.length >= 30) {
		const width =
			1 +
			((bytes[24] ?? 0) |
				((bytes[25] ?? 0) << 8) |
				((bytes[26] ?? 0) << 16));
		const height =
			1 +
			((bytes[27] ?? 0) |
				((bytes[28] ?? 0) << 8) |
				((bytes[29] ?? 0) << 16));
		return width > 0 && height > 0 ? { width, height } : null;
	}
	if (chunk === "VP8 " && bytes.length >= 30) {
		return {
			width: view.getUint16(26, true) & 0x3fff,
			height: view.getUint16(28, true) & 0x3fff,
		};
	}
	if (chunk === "VP8L" && bytes.length >= 25) {
		const bits = view.getUint32(21, true);
		return {
			width: (bits & 0x3fff) + 1,
			height: ((bits >> 14) & 0x3fff) + 1,
		};
	}
	return null;
}

function isoSize(bytes: Uint8Array, view: DataView): ImageSize | null {
	for (let index = 0; index + 16 <= bytes.length; index += 1) {
		if (
			bytes[index] === 0x69 &&
			bytes[index + 1] === 0x73 &&
			bytes[index + 2] === 0x70 &&
			bytes[index + 3] === 0x65
		) {
			const width = view.getUint32(index + 8);
			const height = view.getUint32(index + 12);
			if (
				width > 0 &&
				height > 0 &&
				width < 100_000 &&
				height < 100_000
			) {
				return { width, height };
			}
		}
	}
	return null;
}

// header-only dimensions. useful when the browser refuses to decode a
// tiff or heic file but the bytes still carry the size.
export function probeDimensions(bytes: Uint8Array): ImageSize | null {
	if (bytes.length < 10) {
		return null;
	}
	const view = viewOf(bytes);
	if (matches(bytes, PNG_SIGNATURE) && bytes.length >= 24) {
		return { width: view.getUint32(16), height: view.getUint32(20) };
	}
	const signature = ascii(bytes, 0, 6);
	if (GIF_SIGNATURES.includes(signature)) {
		return {
			width: view.getUint16(6, true),
			height: view.getUint16(8, true),
		};
	}
	if (matches(bytes, [0xff, 0xd8])) {
		return jpegSize(bytes, view);
	}
	if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
		return webpSize(bytes, view);
	}
	const tiff = tiffSize(bytes);
	if (tiff) {
		return tiff;
	}
	if (ISO_BRANDS.includes(ascii(bytes, 4, 4))) {
		return isoSize(bytes, view);
	}
	return null;
}