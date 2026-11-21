import * as Comlink from "comlink";
import { FFMPEG_WORKER_IMPL_URL } from "@/lib/r2";
import { type FfmpegCore, selectCore } from "@/lib/video/ffmpeg-core";
import type { api } from "@/workers/ffmpeg-worker";

export type FfmpegWorker = Comlink.Remote<typeof api>;

let proxy: Promise<FfmpegWorker> | null = null;
let readyCore: FfmpegCore | null = null;

const BOOT_TIMEOUT_MS = 30_000;

async function bootWorker(): Promise<FfmpegWorker> {
	// the worker implementation ships from r2 as one self-contained
	// module (see scripts/build-ffmpeg-worker.mjs) and boots behind a
	// blob url, which is the only worker shape isolated pages accept.
	const source = await (await fetch(FFMPEG_WORKER_IMPL_URL)).text();
	const blobUrl = URL.createObjectURL(
		new Blob([source], { type: "text/javascript" }),
	);
	const worker = new Worker(blobUrl, { type: "module" });
	URL.revokeObjectURL(blobUrl);
	worker.onerror = (event: ErrorEvent) => {
		if (process.env.NODE_ENV !== "production") {
			console.error(
				`[ffmpeg-worker] ${event.message} @${event.filename}:${event.lineno}`,
			);
		}
	};
	const remote = Comlink.wrap<FfmpegWorker>(worker);
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

function detectCore(): FfmpegCore {
	const isolated =
		typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
	return selectCore({
		isolated,
		sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
	});
}

// lazy singleton with one boot retry, then ensures the right core for
// this page. returns which core runs so the ui can say so honestly.
export async function ffmpegLoaded(): Promise<{
	worker: FfmpegWorker;
	core: FfmpegCore;
}> {
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
	const worker = await proxy;
	const core = detectCore();
	if (readyCore !== core) {
		await worker.loadFfmpeg(core);
		readyCore = core;
	}
	return { worker, core };
}
