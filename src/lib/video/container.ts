// mp4, mov, and 3gp metadata straight from the file header. phones hand
// over these containers with codecs the browser preview cannot decode,
// so reading the boxes beats trusting a <video> element.
export interface ContainerMeta {
	durationSec: number;
	width: number;
	height: number;
}

interface Box {
	type: string;
	/** offset of the box content, after the size and type fields */
	start: number;
	/** offset just past the box */
	end: number;
}

function boxAt(view: DataView, offset: number, limit: number): Box | null {
	if (offset + 8 > limit) {
		return null;
	}
	let size = view.getUint32(offset);
	const type = String.fromCharCode(
		view.getUint8(offset + 4),
		view.getUint8(offset + 5),
		view.getUint8(offset + 6),
		view.getUint8(offset + 7),
	);
	let header = 8;
	if (size === 1) {
		if (offset + 16 > limit) {
			return null;
		}
		// 64 bit sizes stay well below Number.MAX_SAFE_INTEGER for video
		size = Number(view.getBigUint64(offset + 8));
		header = 16;
	} else if (size === 0) {
		size = limit - offset;
	}
	if (size < header || offset + size > limit) {
		return null;
	}
	return { type, start: offset + header, end: offset + size };
}

function children(view: DataView, parent: Box): Box[] {
	const out: Box[] = [];
	let offset = parent.start;
	while (offset < parent.end) {
		const box = boxAt(view, offset, parent.end);
		if (!box) {
			break;
		}
		out.push(box);
		offset = box.end;
	}
	return out;
}

function find(view: DataView, parent: Box, type: string): Box | null {
	return children(view, parent).find((box) => box.type === type) ?? null;
}

// tkhd stores the display size as 16.16 fixed point. a portrait iphone
// clip keeps 1920x1080 frames with a 90 degree matrix, and ffmpeg
// autorotates, so the swapped size is the one the user sees.
function trackSize(
	view: DataView,
	tkhd: Box,
): { width: number; height: number } {
	const version = view.getUint8(tkhd.start);
	const base = tkhd.start + (version === 1 ? 88 : 76);
	if (base + 8 > tkhd.end) {
		return { width: 0, height: 0 };
	}
	const width = view.getUint32(base) / 65536;
	const height = view.getUint32(base + 4) / 65536;
	const matrix = tkhd.start + (version === 1 ? 52 : 40);
	if (matrix + 20 <= tkhd.end) {
		const a = view.getInt32(matrix);
		const b = view.getInt32(matrix + 4);
		const rotated = Math.abs(b) > 32768 && Math.abs(a) < 32768;
		if (rotated) {
			return { width: height, height: width };
		}
	}
	return { width, height };
}

function movieDuration(view: DataView, mvhd: Box): number {
	const version = view.getUint8(mvhd.start);
	const timescaleAt = mvhd.start + (version === 1 ? 20 : 12);
	if (timescaleAt + 8 > mvhd.end) {
		return 0;
	}
	const timescale = view.getUint32(timescaleAt);
	const duration =
		version === 1
			? Number(view.getBigUint64(timescaleAt + 4))
			: view.getUint32(timescaleAt + 4);
	if (!timescale || !Number.isFinite(duration) || duration <= 0) {
		return 0;
	}
	return duration / timescale;
}

// parses a moov payload. exported for tests.
export function parseMoov(
	data: ArrayBuffer | Uint8Array,
): ContainerMeta | null {
	const view =
		data instanceof Uint8Array
			? new DataView(
					data.buffer as ArrayBuffer,
					data.byteOffset,
					data.byteLength,
				)
			: new DataView(data);
	const root: Box = { type: "moov", start: 0, end: view.byteLength };
	const mvhd = find(view, root, "mvhd");
	const durationSec = mvhd ? movieDuration(view, mvhd) : 0;
	let best: { width: number; height: number } = { width: 0, height: 0 };
	for (const trak of children(view, root)) {
		if (trak.type !== "trak") {
			continue;
		}
		const tkhd = find(view, trak, "tkhd");
		if (!tkhd) {
			continue;
		}
		const size = trackSize(view, tkhd);
		// audio tracks carry 0x0 here, so the largest track is the video
		if (size.width * size.height > best.width * best.height) {
			best = size;
		}
	}
	if (!durationSec || !best.width || !best.height) {
		return null;
	}
	return { durationSec, width: best.width, height: best.height };
}

const ISO_BRANDS = new Set(["ftyp", "moov", "mdat", "free", "wide", "skip"]);

async function readAt(file: Blob, offset: number, length: number) {
	return file.slice(offset, offset + length).arrayBuffer();
}

// walks the top level boxes without loading mdat, then reads only moov.
// moov can sit at the end of a phone recording, so seeking is required.
export async function readContainerMeta(
	file: Blob,
): Promise<ContainerMeta | null> {
	let offset = 0;
	let first = true;
	for (let guard = 0; guard < 64 && offset + 8 <= file.size; guard += 1) {
		const head = new DataView(await readAt(file, offset, 16));
		let size = head.getUint32(0);
		let header = 8;
		const type = String.fromCharCode(
			head.getUint8(4),
			head.getUint8(5),
			head.getUint8(6),
			head.getUint8(7),
		);
		if (first) {
			first = false;
			if (type !== "ftyp" && !ISO_BRANDS.has(type)) {
				return null;
			}
		}
		if (size === 1) {
			if (head.byteLength < 16) {
				return null;
			}
			size = Number(head.getBigUint64(8));
			header = 16;
		} else if (size === 0) {
			size = file.size - offset;
		}
		if (size < header) {
			return null;
		}
		if (type === "moov") {
			if (size > 64 * 1024 * 1024) {
				return null;
			}
			const payload = await readAt(file, offset + header, size - header);
			return parseMoov(payload);
		}
		offset += size;
	}
	return null;
}
