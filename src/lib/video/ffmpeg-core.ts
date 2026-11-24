// ffmpeg core choice, kept pure so both paths stay unit tested.
// multithreaded needs an isolated page, otherwise single-threaded.
export type FfmpegCore = "mt" | "st";

export interface CoreEnvironment {
	isolated: boolean;
	sharedArrayBuffer: boolean;
	// chromium reports ram in whole gigabytes and hides anything above
	// eight. other browsers leave it undefined.
	deviceMemory?: number;
}

export function selectCore(env: CoreEnvironment): FfmpegCore {
	if (!env.isolated || !env.sharedArrayBuffer) {
		return "st";
	}
	// deviceMemory is chromium only and capped at eight. a phone that
	// hides it is often an iPhone, which is exactly where the threaded
	// heap hurts most, so only a known roomy device gets the threaded
	// core. everything else keeps the light one.
	const memory = env.deviceMemory;
	if (typeof memory !== "number" || !Number.isFinite(memory) || memory <= 4) {
		return "st";
	}
	return "mt";
}

// every thread reserves a stack and its own decode buffers. two threads
// keep the phone responsive and halve the memory the threaded core holds.
export function threadCount(hardwareConcurrency: number): number {
	if (!Number.isFinite(hardwareConcurrency) || hardwareConcurrency < 1) {
		return 1;
	}
	return Math.max(1, Math.min(2, Math.floor(hardwareConcurrency)));
}

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
