import * as Comlink from "comlink";
import { FFMPEG_WORKER_IMPL_URL } from "@/lib/r2";
import {
	type FfmpegCore,
	selectCore,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import { shouldRetryWithSingleThread } from "@/lib/video/limits";
import type { api, FfmpegInput, FfmpegOutput } from "@/workers/ffmpeg-worker";

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
	let core = detectCore();
	if (readyCore !== core) {
		try {
			await worker.loadFfmpeg(core);
			readyCore = core;
		} catch (error) {
			// some phones report isolation and then fail to start the
			// threaded core. the single thread core still converts.
			if (core !== "mt") {
				throw error;
			}
			await worker.loadFfmpeg("st");
			readyCore = "st";
			core = "st";
		}
	}
	return { worker, core: readyCore ?? core };
}

// one job with a single thread retry. a phone that cannot hold the
// threaded core still gets a result, and the caller reports which ran.
export async function runFfmpegWithFallback(
	buildArgs: (threads: number) => string[],
	inputs: FfmpegInput[],
	outputs: string[],
	onProgress?: (ratio: number) => void,
): Promise<{ outputs: FfmpegOutput[]; core: FfmpegCore }> {
	const first = await ffmpegLoaded();
	const execute = (worker: FfmpegWorker, core: FfmpegCore) =>
		worker.runFfmpeg(
			buildArgs(
				core === "mt"
					? threadCount(globalThis.navigator?.hardwareConcurrency ?? 4)
					: 1,
			),
			inputs,
			outputs,
			onProgress ? Comlink.proxy(onProgress) : undefined,
		);
	try {
		return {
			outputs: await execute(first.worker, first.core),
			core: first.core,
		};
	} catch (error) {
		if (first.core !== "mt" || !shouldRetryWithSingleThread(error)) {
			throw error;
		}
		await first.worker.loadFfmpeg("st");
		readyCore = "st";
		return { outputs: await execute(first.worker, "st"), core: "st" };
	}
}
