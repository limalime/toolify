// ffmpeg core choice, kept pure so both paths stay unit tested.
// multithreaded needs an isolated page, otherwise single-threaded.
export type FfmpegCore = "mt" | "st";

export interface CoreEnvironment {
	isolated: boolean;
	sharedArrayBuffer: boolean;
}

export function selectCore(env: CoreEnvironment): FfmpegCore {
	return env.isolated && env.sharedArrayBuffer ? "mt" : "st";
}

export function threadCount(hardwareConcurrency: number): number {
	if (!Number.isFinite(hardwareConcurrency) || hardwareConcurrency < 1) {
		return 1;
	}
	return Math.max(1, Math.min(4, Math.floor(hardwareConcurrency)));
}

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
