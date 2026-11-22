import * as Comlink from "comlink";
import { zipSync } from "fflate";
import {
	mergePdfs,
	PdfError,
	pdfPageCount,
	splitPdf,
} from "@/lib/pdf/merge-split";

export type PdfCode = "empty" | "unreadable" | "range" | "failed";

export type PdfResult<T> =
	| { ok: true; value: T }
	| { ok: false; code: PdfCode };

function fail(unknown: unknown): { ok: false; code: PdfCode } {
	if (unknown instanceof PdfError) {
		return { ok: false, code: unknown.code };
	}
	return { ok: false, code: "failed" };
}

const api = {
	ping: () => true,

	pageCount: async (bytes: ArrayBuffer): Promise<PdfResult<number>> => {
		try {
			return { ok: true, value: await pdfPageCount(bytes) };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	merge: async (
		payload: { files: ArrayBuffer[] },
		onProgress?: (done: number, total: number) => void,
	): Promise<PdfResult<{ bytes: Uint8Array; pages: number }>> => {
		try {
			const value = await mergePdfs(payload.files, (done, total) =>
				onProgress?.(done, total),
			);
			const pages = await pdfPageCount(value);
			return { ok: true, value: { bytes: value, pages } };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	split: async (
		payload: { bytes: ArrayBuffer; groups: number[][] },
		onProgress?: (done: number, total: number) => void,
	): Promise<PdfResult<Uint8Array[]>> => {
		try {
			const value = await splitPdf(
				payload.bytes,
				payload.groups,
				(done, total) => onProgress?.(done, total),
			);
			return { ok: true, value };
		} catch (unknown) {
			return fail(unknown);
		}
	},

	zip: async (
		files: Array<{ name: string; bytes: Uint8Array }>,
	): Promise<PdfResult<Uint8Array>> => {
		try {
			const entries: Record<string, Uint8Array> = {};
			for (const file of files) {
				entries[file.name] = file.bytes;
			}
			return { ok: true, value: zipSync(entries) };
		} catch (unknown) {
			return fail(unknown);
		}
	},
};

export type PdfApi = typeof api;

Comlink.expose(api);
