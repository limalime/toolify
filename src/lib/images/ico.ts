// minimal ICO reader and writer. reads PNG compressed entries (what every
// modern icon uses), writes a single 256px PNG compressed entry.

export interface IcoEntry {
	width: number;
	height: number;
	bytes: Uint8Array;
	png: boolean;
}

function view(bytes: Uint8Array): DataView {
	return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

// parses the icon directory, throws on anything malformed.
export function parseIco(bytes: Uint8Array): IcoEntry[] {
	if (bytes.length < 6) {
		throw new Error("not an icon");
	}
	const header = view(bytes);
	if (header.getUint16(0, true) !== 0 || header.getUint16(2, true) !== 1) {
		throw new Error("not an icon");
	}
	const count = header.getUint16(4, true);
	if (count === 0 || bytes.length < 6 + count * 16) {
		throw new Error("icon has no images");
	}
	const entries: IcoEntry[] = [];
	for (let index = 0; index < count; index++) {
		const offset = 6 + index * 16;
		const width = bytes[offset] === 0 ? 256 : bytes[offset];
		const height = bytes[offset + 1] === 0 ? 256 : bytes[offset + 1];
		const size = header.getUint32(offset + 8, true);
		const start = header.getUint32(offset + 12, true);
		if (start + size > bytes.length) {
			throw new Error("icon entry out of range");
		}
		const data = bytes.slice(start, start + size);
		const png =
			size > 8 &&
			data[0] === 0x89 &&
			data[1] === 0x50 &&
			data[2] === 0x4e &&
			data[3] === 0x47;
		entries.push({ width, height, bytes: data, png });
	}
	return entries;
}

// largest png entry first, the honest pick for decoding.
export function pickPngEntry(entries: IcoEntry[]): IcoEntry {
	const png = entries.filter((entry) => entry.png);
	if (png.length === 0) {
		throw new Error("only png compressed icons are supported");
	}
	return png.sort(
		(a, b) => b.width * b.height - a.width * a.height,
	)[0] as IcoEntry;
}

// single entry icon file wrapping ready made png bytes.
export function buildIco(png: Uint8Array, size: number): Uint8Array {
	const edge = size >= 256 ? 0 : size;
	const out = new Uint8Array(6 + 16 + png.length);
	const header = view(out);
	header.setUint16(0, 0, true);
	header.setUint16(2, 1, true);
	header.setUint16(4, 1, true);
	out[6] = edge;
	out[7] = edge;
	out[8] = 0;
	out[9] = 0;
	header.setUint16(10, 1, true);
	header.setUint16(12, 32, true);
	header.setUint32(14, png.length, true);
	header.setUint32(18, 6 + 16, true);
	out.set(png, 6 + 16);
	return out;
}
