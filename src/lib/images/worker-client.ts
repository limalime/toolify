import * as Comlink from "comlink";
import type { api } from "@/workers/image-worker";

export type ImageWorker = Comlink.Remote<typeof api>;

let proxy: Promise<ImageWorker> | null = null;

const BOOT_TIMEOUT_MS = 30_000;

async function bootWorker(): Promise<ImageWorker> {
	const worker = new Worker(
		new URL("../../workers/image-worker.ts", import.meta.url),
	);
	const remote = Comlink.wrap<ImageWorker>(worker);
	let timer: ReturnType<typeof setTimeout> | null = null;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error("worker boot timed out")),
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

// lazy singleton, the worker and its codecs load on first use. the ping
// turns a worker that never boots into an honest error, retried once
// because the first boot can race the dev compiler under parallel load.
export function imageWorker(): Promise<ImageWorker> {
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
