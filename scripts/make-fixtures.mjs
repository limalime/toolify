// Generates binary test fixtures with zero native dependencies:
// a gradient photo PNG, a flat logo PNG, and a one page PDF saved both
// as .pdf and .ai (modern AI files carry a PDF compatible portion).

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const dir = join(root, "tests", "fixtures");
mkdirSync(dir, { recursive: true });

const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	crcTable[n] = c;
}

function crc(bytes) {
	let c = 0xffffffff;
	for (const byte of bytes) {
		c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const sum = Buffer.alloc(4);
	sum.writeUInt32BE(crc(body));
	return Buffer.concat([length, body, sum]);
}

// minimal truecolor PNG writer, 8 bit, no interlace.
function writePng(path, width, height, pixel) {
	const header = Buffer.alloc(13);
	header.writeUInt32BE(width, 0);
	header.writeUInt32BE(height, 4);
	header[8] = 8;
	header[9] = 2;
	const rows = [];
	for (let y = 0; y < height; y++) {
		const row = Buffer.alloc(1 + width * 3);
		for (let x = 0; x < width; x++) {
			const [r, g, b] = pixel(x, y, width, height);
			row[1 + x * 3] = r;
			row[1 + x * 3 + 1] = g;
			row[1 + x * 3 + 2] = b;
		}
		rows.push(row);
	}
	const png = Buffer.concat([
		Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
		chunk("IHDR", header),
		chunk("IDAT", deflateSync(Buffer.concat(rows))),
		chunk("IEND", Buffer.alloc(0)),
	]);
	writeFileSync(path, png);
	console.log("wrote", path, `${(png.length / 1024).toFixed(1)} KB`);
}

// busy gradient photo with shapes, hard to compress, easy to eyeball.
writePng(join(dir, "photo.png"), 800, 600, (x, y, w, h) => {
	const sky = Math.floor((y / h) * 200);
	const sunDx = x - w * 0.72;
	const sunDy = y - h * 0.28;
	if (sunDx * sunDx + sunDy * sunDy < 70 * 70) {
		return [255, 214, 64];
	}
	if (y > h * 0.62 && (x + y * 3) % 40 < 20) {
		return [46, 160, 67];
	}
	return [
		Math.floor((x / w) * 90) + 20,
		120 + Math.floor(sky / 3),
		200 - Math.floor(sky / 4),
	];
});

// flat few color logo, sharp edges, ideal for tracing tests.
writePng(join(dir, "logo.png"), 400, 400, (x, y, w, h) => {
	if (x < 24 || y < 24 || x >= w - 24 || y >= h - 24) {
		return [27, 86, 253];
	}
	const cx = x - w / 2;
	const cy = y - h / 2;
	if (cx * cx + cy * cy < 110 * 110) {
		return [241, 245, 249];
	}
	return [10, 14, 20];
});

// one page vector pdf through jspdf, then reused as the .ai fixture.
const require = createRequire(join(root, "package.json"));
const { jsPDF } = require("jspdf");
const pdf = new jsPDF({ unit: "pt", format: [400, 300] });
pdf.setFillColor(27, 86, 253);
pdf.rect(20, 20, 360, 120, "F");
pdf.setTextColor(255, 255, 255);
pdf.setFontSize(28);
pdf.text("Toolify fixture", 40, 90);
pdf.setFillColor(46, 213, 115);
pdf.circle(320, 220, 40, "F");
const pdfPath = join(dir, "sample.pdf");
pdf.save(pdfPath);
console.log("wrote", pdfPath);
copyFileSync(pdfPath, join(dir, "sample.ai"));
console.log("wrote", join(dir, "sample.ai"));

// show what we have and whether the png files parse.
for (const name of ["photo.png", "logo.png", "sample.pdf", "sample.ai"]) {
	const path = join(dir, name);
	if (!existsSync(path)) {
		throw new Error(`missing fixture ${name}`);
	}
}
try {
	execFileSync(
		"file",
		[...["photo.png", "logo.png"].map((n) => join(dir, n))],
		{
			stdio: "inherit",
		},
	);
} catch {
	console.log("(file command unavailable, skipping type check)");
}
