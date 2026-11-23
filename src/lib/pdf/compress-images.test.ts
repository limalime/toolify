import { readFileSync } from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFName,
	PDFRawStream,
	type PDFRef,
	PDFString,
	StandardFonts,
} from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
	compressPdfImages,
	expandToRgba,
	type ImageCodec,
	targetPixels,
	undoPredictor,
} from "./compress-images";

function nodeCodec(): ImageCodec {
	return {
		async transcodeJpeg(bytes, width, height, quality) {
			const image = await loadImage(Buffer.from(bytes));
			const canvas = createCanvas(width, height);
			const context = canvas.getContext("2d");
			context.drawImage(image, 0, 0, width, height);
			return new Uint8Array(canvas.toBuffer("image/jpeg", quality));
		},
		async encodeRgba(rgba, width, height, targetWidth, targetHeight, quality) {
			const source = createCanvas(width, height);
			const context = source.getContext("2d");
			const frame = context.createImageData(width, height);
			frame.data.set(rgba);
			context.putImageData(frame, 0, 0);
			const target = createCanvas(targetWidth, targetHeight);
			target
				.getContext("2d")
				.drawImage(source, 0, 0, targetWidth, targetHeight);
			return new Uint8Array(target.toBuffer("image/jpeg", quality));
		},
	};
}

async function textOf(bytes: Uint8Array): Promise<string> {
	const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const task = pdfjs.getDocument({ data: bytes, useSystemFonts: false });
	const document = await task.promise;
	let text = "";
	for (let index = 1; index <= document.numPages; index += 1) {
		const page = await document.getPage(index);
		const content = await page.getTextContent();
		text += content.items
			.map((item) => ("str" in item ? item.str : ""))
			.join(" ");
	}
	await task.destroy();
	return text;
}

function imageStreams(document: PDFDocument) {
	return document.context
		.enumerateIndirectObjects()
		.filter(
			(entry): entry is [PDFRef, PDFRawStream] =>
				entry[1] instanceof PDFRawStream &&
				entry[1].dict.lookup(PDFName.of("Subtype"))?.toString() === "/Image",
		)
		.map(([ref, stream]) => ({ ref, stream }));
}

async function samplePhoto(): Promise<Uint8Array> {
	const canvas = createCanvas(1400, 1000);
	const context = canvas.getContext("2d");
	const gradient = context.createLinearGradient(0, 0, 1400, 1000);
	gradient.addColorStop(0, "#0f766e");
	gradient.addColorStop(1, "#f97316");
	context.fillStyle = gradient;
	context.fillRect(0, 0, 1400, 1000);
	for (let index = 0; index < 6000; index += 1) {
		context.fillStyle = `hsl(${(index * 37) % 360} 80% 55%)`;
		context.fillRect((index * 53) % 1400, (index * 97) % 1000, 18, 18);
	}
	return new Uint8Array(canvas.toBuffer("image/jpeg", 0.95));
}

async function buildContractPdf(): Promise<Uint8Array> {
	const document = await PDFDocument.create();
	const page = document.addPage([612, 792]);
	const font = await document.embedFont(StandardFonts.Helvetica);
	page.drawText("Text stays selectable", {
		x: 50,
		y: 700,
		size: 18,
		font,
	});
	page.drawText("Second line of real text", {
		x: 50,
		y: 674,
		size: 12,
		font,
	});
	const jpeg = await samplePhoto();
	const photo = await document.embedJpg(jpeg);
	page.drawImage(photo, { x: 50, y: 220, width: 512, height: 366 });
	const link = document.context.obj({
		Type: "Annot",
		Subtype: "Link",
		Rect: [50, 650, 250, 680],
		Border: [0, 0, 0],
		A: {
			S: "URI",
			URI: PDFString.of("https://toolify.bond"),
		},
	});
	page.node.set(PDFName.of("Annots"), document.context.obj([link]));

	const context = document.context;
	const base = {
		Type: "XObject",
		Subtype: "Image",
		Width: 64,
		Height: 64,
		BitsPerComponent: 8,
		ColorSpace: "DeviceRGB",
		Filter: "DCTDecode",
	};
	context.register(
		PDFRawStream.of(context.obj({ ...base, Decode: [1, 0, 1, 0, 1, 0] }), jpeg),
	);
	context.register(
		PDFRawStream.of(context.obj({ ...base, ImageMask: true }), jpeg),
	);
	const mask = context.register(
		PDFRawStream.of(
			context.obj({
				...base,
				ColorSpace: "DeviceGray",
				Filter: "FlateDecode",
			}),
			new Uint8Array(64 * 64),
		),
	);
	context.register(
		PDFRawStream.of(context.obj({ ...base, SMask: mask }), jpeg),
	);
	return document.save();
}

describe("pdf image compression helpers", () => {
	it("downscales to the dpi cap without enlarging", () => {
		expect(targetPixels(4000, 3000, 72, 612)).toEqual({
			width: 612,
			height: 459,
		});
		expect(targetPixels(500, 400, 72, 612)).toEqual({
			width: 500,
			height: 400,
		});
		expect(targetPixels(9000, 3000, 120, 612).width).toBeLessThanOrEqual(4096);
	});

	it("undoes png and tiff predictors", () => {
		const png = undoPredictor(
			new Uint8Array([1, 10, 20, 30, 5, 5, 5, 2, 1, 1, 1, 1, 1, 1]),
			{
				predictor: 12,
				colors: 3,
				columns: 2,
				bitsPerComponent: 8,
				height: 2,
			},
		);
		expect(Array.from(png ?? [])).toEqual([
			10, 20, 30, 15, 25, 35, 11, 21, 31, 16, 26, 36,
		]);

		const tiff = undoPredictor(
			new Uint8Array([10, 20, 30, 5, 5, 5, 1, 1, 1, 1, 1, 1]),
			{
				predictor: 2,
				colors: 3,
				columns: 2,
				bitsPerComponent: 8,
				height: 2,
			},
		);
		expect(Array.from(tiff ?? [])).toEqual([
			10, 20, 30, 15, 25, 35, 1, 1, 1, 2, 2, 2,
		]);
	});

	it("expands gray, cmyk and indexed samples to rgba", () => {
		expect(
			Array.from(expandToRgba(new Uint8Array([0, 255]), 2, 1, 1) ?? []),
		).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
		expect(
			Array.from(expandToRgba(new Uint8Array([0, 255, 255, 0]), 1, 1, 4) ?? []),
		).toEqual([255, 0, 0, 255]);
		expect(
			Array.from(
				expandToRgba(
					new Uint8Array([1]),
					1,
					1,
					1,
					new Uint8Array([0, 0, 0, 255, 0, 0]),
				) ?? [],
			),
		).toEqual([255, 0, 0, 255]);
	});
});

describe("compressPdfImages", () => {
	it("re-encodes images without touching text or links", async () => {
		const original = await buildContractPdf();
		const summary = await compressPdfImages(original, {
			quality: "low",
			codec: nodeCodec(),
		});

		expect(summary.replaced).toBe(1);
		expect(summary.images).toBe(3);
		expect(summary.pages).toBe(1);
		expect(summary.bytes.length).toBeLessThan(original.length);

		const output = await PDFDocument.load(summary.bytes);
		const resized = imageStreams(output).filter(
			(entry) =>
				entry.stream.dict.get(PDFName.of("Width"))?.toString() === "612",
		);
		expect(resized).toHaveLength(1);
		const dict = resized[0].stream.dict;
		expect(dict.get(PDFName.of("Filter"))?.toString()).toBe("/DCTDecode");
		expect(dict.get(PDFName.of("Width"))?.toString()).toBe("612");

		expect(await textOf(summary.bytes)).toContain("Text stays selectable");

		const page = output.getPage(0);
		const annotations = page.node.lookup(PDFName.of("Annots"), PDFArray);
		expect(annotations.size()).toBe(1);
		const action = annotations
			.lookup(0, PDFDict)
			.lookup(PDFName.of("A"), PDFDict);
		expect(action.lookup(PDFName.of("URI"), PDFString).decodeText()).toBe(
			"https://toolify.bond",
		);
	});

	it("returns a text-only pdf untouched", async () => {
		const original = new Uint8Array(readFileSync("tests/fixtures/sample.pdf"));
		const summary = await compressPdfImages(original, {
			quality: "low",
			codec: nodeCodec(),
		});
		expect(summary.images).toBe(0);
		expect(summary.replaced).toBe(0);
		expect(summary.bytes).toEqual(original);
		expect(await textOf(summary.bytes)).toContain("Toolify fixture");
	});
});
