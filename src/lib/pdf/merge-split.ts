import { PDFDocument } from "pdf-lib";

export type PdfCode = "empty" | "unreadable" | "range";

export class PdfError extends Error {
	readonly code: PdfCode;

	constructor(code: PdfCode) {
		super(code);
		this.name = "PdfError";
		this.code = code;
	}
}

type Bytes = ArrayBuffer | Uint8Array;

async function load(bytes: Bytes): Promise<PDFDocument> {
	try {
		return await PDFDocument.load(bytes, { updateMetadata: false });
	} catch {
		throw new PdfError("unreadable");
	}
}

export async function mergePdfs(
	inputs: ArrayBuffer[],
	onStep?: (done: number, total: number) => void,
): Promise<Uint8Array> {
	if (inputs.length === 0) {
		throw new PdfError("empty");
	}

	const merged = await PDFDocument.create();
	let done = 0;
	for (const input of inputs) {
		const source = await load(input);
		const pages = await merged.copyPages(source, source.getPageIndices());
		for (const page of pages) {
			merged.addPage(page);
		}
		done += 1;
		onStep?.(done, inputs.length);
	}
	return merged.save();
}

export async function pdfPageCount(input: Bytes): Promise<number> {
	const doc = await load(input);
	return doc.getPageCount();
}

export async function splitPdf(
	input: Bytes,
	groups: number[][],
	onStep?: (done: number, total: number) => void,
): Promise<Uint8Array[]> {
	const source = await load(input);
	const total = source.getPageCount();

	for (const group of groups) {
		if (group.length === 0) {
			throw new PdfError("range");
		}
		for (const page of group) {
			if (!Number.isInteger(page) || page < 0 || page >= total) {
				throw new PdfError("range");
			}
		}
	}

	const parts: Uint8Array[] = [];
	let done = 0;
	for (const group of groups) {
		const part = await PDFDocument.create();
		const pages = await part.copyPages(source, group);
		for (const page of pages) {
			part.addPage(page);
		}
		parts.push(await part.save());
		done += 1;
		onStep?.(done, groups.length);
	}
	return parts;
}
