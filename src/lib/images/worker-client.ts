import * as Comlink from "comlink";
import type { api } from "@/workers/image-worker";

export type ImageWorker = Comlink.Remote<typeof api>;

let proxy: Promise<ImageWorker> | null = null;

// lazy singleton, the worker and its codecs load on first use.
export function imageWorker(): Promise<ImageWorker> {
	if (!proxy) {
		proxy = (async () => {
			const worker = new Worker(
				new URL("../../workers/image-worker.ts", import.meta.url),
			);
			return Comlink.wrap<ImageWorker>(worker);
		})();
	}
	return proxy;
}
