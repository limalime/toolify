import { type FfmpegCore, MAX_VIDEO_BYTES } from "./ffmpeg-core";

// container names for messages. the extension is the only hint a phone
// gives us before the engine runs, and naming it beats "corrupted".
const CONTAINERS: Record<string, string> = {
	"3g2": "3G2",
	"3gp": "3GP",
	avi: "AVI",
	flv: "FLV",
	m2ts: "M2TS",
	m4v: "MP4",
	mkv: "MKV",
	mov: "MOV",
	mp4: "MP4",
	mpeg: "MPEG",
	mpg: "MPEG",
	mts: "MTS",
	ogg: "OGG",
	ogv: "OGG",
	qt: "MOV",
	ts: "TS",
	webm: "WebM",
	wmv: "WMV",
};

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function videoFormat(file: { name: string; type: string }): string {
	const ext = extensionOf(file.name);
	const named = CONTAINERS[ext];
	if (named) {
		return named;
	}
	if (file.type.startsWith("video/")) {
		const subtype = file.type.slice("video/".length);
		return subtype ? subtype.toUpperCase() : "video";
	}
	return ext ? ext.toUpperCase() : "video";
}

export type VideoCheck =
	| { ok: true }
	| { ok: false; kind: "size"; limit: number }
	| { ok: false; kind: "format"; format: string };

// phones hand over mov, 3gp, and hevc files the browser cannot preview.
// checking the container keeps those files, the engine decides the rest.
export function checkVideoFile(
	file: { name: string; type: string; size: number },
	limit = MAX_VIDEO_BYTES,
): VideoCheck {
	if (file.size > limit) {
		return { ok: false, kind: "size", limit };
	}
	if (CONTAINERS[extensionOf(file.name)]) {
		return { ok: true };
	}
	if (file.type.startsWith("video/") && file.type.length > "video/".length) {
		return { ok: true };
	}
	return { ok: false, kind: "format", format: videoFormat(file) };
}

export type VideoErrorKind = "memory" | "unsupported" | "unknown";

// the engine itself failed to start, which is never the file's fault.
export class FfmpegEngineError extends Error {
	readonly reason: unknown;

	constructor(message: string, reason?: unknown) {
		super(message);
		this.name = "FfmpegEngineError";
		this.reason = reason;
	}
}

export type FailureKind = "engine" | "memory" | "unsupported" | "unknown";

// maps any thrown job error to the message a tool should show. a core
// that died for lack of memory is a memory story, not a network story,
// so the reason it wrapped still counts.
export function classifyFailure(error: unknown): FailureKind {
	if (error instanceof FfmpegEngineError) {
		return classifyVideoError(error.reason) === "memory" ? "memory" : "engine";
	}
	return classifyVideoError(error);
}

export function errorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
	}
	// a rejected worker occasionally hands back a plain object carrying
	// the original message, so read it instead of losing the cause.
	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
	) {
		return (error as { message: string }).message;
	}
	return "";
}

export function classifyVideoError(error: unknown): VideoErrorKind {
	const message = errorMessage(error);
	if (
		/memory|alloc|out of bounds|oom|cannot enlarge|array buffer/i.test(message)
	) {
		return "memory";
	}
	if (
		/decoder|decode|codec|unsupported|invalid data|moov|truncated|corrupt|no such file|not found/i.test(
			message,
		)
	) {
		return "unsupported";
	}
	return "unknown";
}

// the single thread core uses less memory and no shared workers. only a
// memory failure or a core that never started is worth a second run, a
// decode failure would fail the same way again.
export function shouldRetryOnSingleThread(
	core: FfmpegCore,
	error: unknown,
): boolean {
	if (core !== "mt") {
		return false;
	}
	return (
		error instanceof FfmpegEngineError || classifyVideoError(error) === "memory"
	);
}
