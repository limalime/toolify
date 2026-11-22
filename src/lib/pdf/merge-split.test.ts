import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { mergePdfs, PdfError, pdfPageCount, splitPdf } from "./merge-split";

async function makePdf(sizes: Array<[number, number]>): Promise<ArrayBuffer> {
	const doc = await PDFDocument.create();
	for (const [width, height] of sizes) {
		doc.addPage([width, height]);
	}
	const bytes = await doc.save();
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

async function pageSizes(bytes: Uint8Array): Promise<Array<[number, number]>> {
	const doc = await PDFDocument.load(bytes);
	return doc.getPages().map((page) => {
		const box = page.getMediaBox();
		return [box.width, box.height] as [number, number];
	});
}

function codeOf(run: () => Promise<unknown>) {
	return run().then(
		() => null,
		(unknown) => (unknown instanceof PdfError ? unknown.code : "other"),
	);
}

describe("pdf merge and split", () => {
	it("merges documents in the given order", async () => {
		const first = await makePdf([
			[200, 300],
			[210, 310],
		]);
		const second = await makePdf([[400, 500]]);
		const merged = await mergePdfs([first, second]);
		expect(await pageSizes(merged)).toEqual([
			[200, 300],
			[210, 310],
			[400, 500],
		]);
	});

	it("counts pages in a pdf", async () => {
		const bytes = await makePdf([
			[100, 100],
			[100, 100],
			[100, 100],
		]);
		expect(await pdfPageCount(bytes)).toBe(3);
	});

	it("splits by page groups and keeps the requested order", async () => {
		const source = await makePdf([
			[100, 110],
			[200, 210],
			[300, 310],
			[400, 410],
		]);
		const parts = await splitPdf(source, [[2, 0], [3]]);
		expect(parts).toHaveLength(2);
		expect(await pageSizes(parts[0] as Uint8Array)).toEqual([
			[300, 310],
			[100, 110],
		]);
		expect(await pageSizes(parts[1] as Uint8Array)).toEqual([[400, 410]]);
	});

	it("rejects empty merge input", async () => {
		expect(await codeOf(() => mergePdfs([]))).toBe("empty");
	});

	it("rejects broken pdf bytes with a readable error code", async () => {
		const broken = new TextEncoder().encode("not a pdf at all").buffer;
		expect(await codeOf(() => mergePdfs([broken]))).toBe("unreadable");
		expect(await codeOf(() => pdfPageCount(broken))).toBe("unreadable");
	});

	it("rejects an out of bounds group", async () => {
		const source = await makePdf([[100, 100]]);
		expect(await codeOf(() => splitPdf(source, [[3]]))).toBe("range");
	});

	it("reports progress while merging", async () => {
		const first = await makePdf([[100, 100]]);
		const second = await makePdf([[100, 100]]);
		const steps: number[] = [];
		await mergePdfs([first, second], (done) => steps.push(done));
		expect(steps).toEqual([1, 2]);
	});

	it("reports progress while splitting", async () => {
		const source = await makePdf([
			[100, 100],
			[100, 100],
			[100, 100],
		]);
		const steps: number[] = [];
		await splitPdf(source, [[0], [1], [2]], (done) => steps.push(done));
		expect(steps).toEqual([1, 2, 3]);
	});
});
