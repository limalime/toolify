import * as Comlink from "comlink";
import { FFMPEG_WORKER_IMPL_URL } from "@/lib/r2";
import {
	type FfmpegCore,
	selectCore,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import {
	FfmpegEngineError,
	shouldRetryOnSingleThread,
} from "@/lib/video/limits";
import type { api, FfmpegInput, FfmpegOutput } from "@/workers/ffmpeg-worker";

export type FfmpegWorker = Comlink.Remote<typeof api>;

const BOOT_TIMEOUT_MS = 30_000;

interface BootedWorker {
	worker: Worker;
	remote: FfmpegWorker;
}

// the worker source is small and immutable, so fetch it once. a fresh
// worker per job then costs no extra network request.
let workerSource: Promise<string> | null = null;

function loadWorkerSource(): Promise<string> {
	workerSource ??= fetch(FFMPEG_WORKER_IMPL_URL)
		.then((response) => response.text())
		.catch((unknown: unknown) => {
			workerSource = null;
			throw unknown;
		});
	return workerSource;
}

async function startWorker(): Promise<BootedWorker> {
	// the worker implementation ships from r2 as one self-contained
	// module (see scripts/build-ffmpeg-worker.mjs) and boots behind a
	// blob url, which is the only worker shape isolated pages accept.
	const source = await loadWorkerSource();
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
	return { worker, remote };
}

// one boot retry covers a transient fetch or module error.
async function bootWorker(): Promise<BootedWorker> {
	try {
		return await startWorker();
	} catch {
		return await startWorker();
	}
}

function detectCore(): FfmpegCore {
	const navigatorWithMemory = globalThis.navigator as
		| (Navigator & { deviceMemory?: number })
		| undefined;
	const isolated =
		typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
	return selectCore({
		isolated,
		sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
		deviceMemory: navigatorWithMemory?.deviceMemory,
	});
}

function threadsFor(core: FfmpegCore): number {
	return core === "mt"
		? threadCount(globalThis.navigator?.hardwareConcurrency ?? 2)
		: 1;
}

// the engine could not start at all. callers say "engine failed" for
// this instead of blaming the file.
async function runOnce(
	core: FfmpegCore,
	buildArgs: (threads: number) => string[],
	inputs: FfmpegInput[],
	outputs: string[],
	onProgress?: (ratio: number) => void,
): Promise<{ outputs: FfmpegOutput[]; core: FfmpegCore }> {
	let booted: BootedWorker;
	try {
		booted = await bootWorker();
	} catch (unknown) {
		throw new FfmpegEngineError("ffmpeg worker failed to start", unknown);
	}
	try {
		try {
			await booted.remote.loadFfmpeg(core);
		} catch (unknown) {
			throw new FfmpegEngineError("ffmpeg core failed to load", unknown);
		}
		const data = await booted.remote.runFfmpeg(
			buildArgs(threadsFor(core)),
			inputs,
			outputs,
			onProgress ? Comlink.proxy(onProgress) : undefined,
		);
		return { outputs: data, core };
	} finally {
		// the wasm heap never shrinks inside a worker. dropping the whole
		// worker is what gives the next job a clean heap, which is the
		// difference between one conversion and several on a phone.
		booted.worker.terminate();
	}
}

// one job in a worker that lives only for that job. a memory failure
// that was not the file's fault gets one retry in a brand new worker on
// the lighter core. the old heap is gone before the retry starts.
export async function runFfmpegJob(
	buildArgs: (threads: number) => string[],
	inputs: FfmpegInput[],
	outputs: string[],
	onProgress?: (ratio: number) => void,
): Promise<{ outputs: FfmpegOutput[]; core: FfmpegCore }> {
	const preferred = detectCore();
	try {
		return await runOnce(preferred, buildArgs, inputs, outputs, onProgress);
	} catch (first) {
		// only a memory failure or a core that never started earns a retry,
		// and never on the core that just failed. runOnce already dropped
		// that worker, so the retry always gets a clean heap.
		if (!shouldRetryOnSingleThread(preferred, first)) {
			throw first;
		}
		return runOnce("st", buildArgs, inputs, outputs, onProgress);
	}
}
