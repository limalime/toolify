import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";
import * as Comlink from "comlink";
import {
	FFMPEG_CLASS_WORKER_URL,
	FFMPEG_ESM_BASE,
	FFMPEG_MT_BASE,
	FFMPEG_ST_BASE,
} from "@/lib/r2";
import type { FfmpegCore } from "@/lib/video/ffmpeg-core";

export type FfmpegProgress = (ratio: number) => void;

export interface FfmpegInput {
	name: string;
	data: ArrayBuffer;
}

export interface FfmpegOutput {
	name: string;
	data: ArrayBuffer;
}

let ffmpeg: FFmpeg | null = null;
let loadedCore: FfmpegCore | null = null;

export async function ping(): Promise<string> {
	return "pong";
}

// loads the api from r2 at runtime (bundling it breaks the worker
// build) and every worker behind blob urls, which is the only worker
// shape isolated pages accept.
export async function loadFfmpeg(core: FfmpegCore): Promise<void> {
	if (ffmpeg && loadedCore === core) {
		return;
	}
	if (ffmpeg) {
		ffmpeg.terminate();
		ffmpeg = null;
		loadedCore = null;
	}
	const { FFmpeg: FFmpegClass } = (await import(
		/* webpackIgnore: true */ `${FFMPEG_ESM_BASE}/index.js`
	)) as unknown as { FFmpeg: new () => FFmpeg };
	const base = core === "mt" ? FFMPEG_MT_BASE : FFMPEG_ST_BASE;
	const instance = new FFmpegClass();
	const classWorkerURL = await toBlobURL(
		FFMPEG_CLASS_WORKER_URL,
		"text/javascript",
	);
	const coreURL = await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript");
	const wasmURL = await toBlobURL(
		`${base}/ffmpeg-core.wasm`,
		"application/wasm",
	);
	const workerURL =
		core === "mt"
			? await toBlobURL(`${base}/ffmpeg-core.worker.js`, "text/javascript")
			: undefined;
	await instance.load({ classWorkerURL, coreURL, wasmURL, workerURL });
	ffmpeg = instance;
	loadedCore = core;
}

// one ffmpeg call: stage inputs, run, collect outputs, clean the memfs.
// progress arrives as 0 to 1 when ffmpeg knows the total duration.
export async function runFfmpeg(
	args: string[],
	inputs: FfmpegInput[],
	outputs: string[],
	onProgress?: FfmpegProgress,
): Promise<FfmpegOutput[]> {
	if (!ffmpeg) {
		throw new Error("ffmpeg not loaded");
	}
	const active = ffmpeg;
	const progress = ({ progress: ratio }: { progress: number }) => {
		if (Number.isFinite(ratio)) {
			onProgress?.(Math.min(1, Math.max(0, ratio)));
		}
	};
	active.on("progress", progress);
	try {
		for (const input of inputs) {
			await active.writeFile(input.name, new Uint8Array(input.data));
		}
		const code = await active.exec(args);
		if (code !== 0) {
			throw new Error(`ffmpeg failed with code ${code}`);
		}
		const results: FfmpegOutput[] = [];
		for (const name of outputs) {
			const data = await active.readFile(name);
			if (typeof data === "string") {
				results.push({
					name,
					data: new TextEncoder().encode(data).buffer as ArrayBuffer,
				});
			} else {
				results.push({ name, data: data.slice().buffer as ArrayBuffer });
			}
		}
		return results;
	} finally {
		active.off("progress", progress);
		for (const input of inputs) {
			await active.deleteFile(input.name).catch(() => {});
		}
		for (const name of outputs) {
			await active.deleteFile(name).catch(() => {});
		}
	}
}

export const api = { ping, loadFfmpeg, runFfmpeg };

Comlink.expose(api);
