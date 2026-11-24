import { MAX_VIDEO_BYTES } from "./ffmpeg-core";

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

export function errorMessage(error: unknown): string {
	if (typeof error === "string") {
		return error;
	}
	if (error instanceof Error) {
		return error.message;
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

// the single thread core uses less memory and no shared workers. retrying
// a decode failure there only wastes a second download.
export function shouldRetryWithSingleThread(error: unknown): boolean {
	return classifyVideoError(error) !== "unsupported";
}
