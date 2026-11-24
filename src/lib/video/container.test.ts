import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMoov, readContainerMeta } from "./container";

function box(type: string, payload: Buffer): Buffer {
	const head = Buffer.alloc(8);
	head.writeUInt32BE(payload.length + 8, 0);
	head.write(type, 4, "ascii");
	return Buffer.concat([head, payload]);
}

function mvhd(timescale: number, duration: number): Buffer {
	const body = Buffer.alloc(20);
	body.writeUInt32BE(timescale, 12);
	body.writeUInt32BE(duration, 16);
	return box("mvhd", body);
}

function tkhd(width: number, height: number, rotate = false): Buffer {
	const body = Buffer.alloc(84);
	// display matrix at offset 40, rotation by 90 degrees swaps axes
	body.writeInt32BE(rotate ? 0 : 65536, 40);
	body.writeInt32BE(rotate ? 65536 : 0, 44);
	body.writeUInt32BE(width * 65536, 76);
	body.writeUInt32BE(height * 65536, 80);
	return box("tkhd", body);
}

describe("parseMoov", () => {
	it("reads duration and the largest track size", () => {
		const moov = Buffer.concat([
			mvhd(600, 1800),
			box("trak", tkhd(1920, 1080)),
			box("trak", tkhd(0, 0)),
		]);
		expect(parseMoov(new Uint8Array(moov))).toEqual({
			durationSec: 3,
			width: 1920,
			height: 1080,
		});
	});

	it("swaps a rotated portrait clip back to what the user sees", () => {
		const moov = Buffer.concat([
			mvhd(1000, 5000),
			box("trak", tkhd(1920, 1080, true)),
		]);
		expect(parseMoov(new Uint8Array(moov))).toEqual({
			durationSec: 5,
			width: 1080,
			height: 1920,
		});
	});

	it("rejects a moov without a video track", () => {
		const moov = Buffer.concat([mvhd(600, 600), box("trak", tkhd(0, 0))]);
		expect(parseMoov(new Uint8Array(moov))).toBeNull();
	});
});

describe("readContainerMeta", () => {
	it("finds moov after a large media box", async () => {
		const file = readFileSync(join(process.cwd(), "tests/fixtures/sample.mp4"));
		const meta = await readContainerMeta(new Blob([file]));
		expect(meta).toEqual({ durationSec: 3, width: 320, height: 240 });
	});

	it("returns null for a file that is not an iso container", async () => {
		const meta = await readContainerMeta(new Blob(["not a video at all"]));
		expect(meta).toBeNull();
	});
});
