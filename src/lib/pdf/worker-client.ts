import * as Comlink from "comlink";
import type { PdfApi } from "@/workers/pdf-worker";

export type PdfWorker = Comlink.Remote<PdfApi>;

let proxy: Promise<PdfWorker> | null = null;

const BOOT_TIMEOUT_MS = 30_000;

async function bootWorker(): Promise<PdfWorker> {
	const worker = new Worker(
		new URL("../../workers/pdf-worker.ts", import.meta.url),
		{ type: "module" },
	);
	const remote = Comlink.wrap<PdfWorker>(worker);
	let timer: ReturnType<typeof setTimeout> | null = null;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("pdf worker boot timed out")),
			BOOT_TIMEOUT_MS,
		);
	});
	try {
		await Promise.race([remote.ping(), timeout]);
	} catch (unknown) {
		worker.terminate();
		throw unknown;
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
	}
	return remote;
}

// lazy singleton, pdf-lib and the worker load on the first merge or split.
// the failed boot is retried once because the dev compiler can race it.
export function pdfWorker(): Promise<PdfWorker> {
	if (!proxy) {
		proxy = (async () => {
			try {
				return await bootWorker();
			} catch {
				return await bootWorker();
			}
		})().catch((unknown: unknown) => {
			proxy = null;
			throw unknown;
		});
	}
	return proxy;
}
