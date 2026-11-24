import { describe, expect, it } from "vitest";
import {
	checkVideoFile,
	classifyFailure,
	classifyVideoError,
	FfmpegEngineError,
	shouldRetryOnSingleThread,
	videoFormat,
} from "./limits";

describe("video format names", () => {
	it("names phone containers from the extension", () => {
		expect(videoFormat({ name: "IMG_0420.MOV", type: "" })).toBe("MOV");
		expect(videoFormat({ name: "clip.3gp", type: "" })).toBe("3GP");
		expect(videoFormat({ name: "clip.mp4", type: "video/mp4" })).toBe("MP4");
	});

	it("falls back to the mime subtype", () => {
		expect(videoFormat({ name: "capture", type: "video/webm" })).toBe("WEBM");
	});

	it("stays generic when nothing is known", () => {
		expect(videoFormat({ name: "capture", type: "" })).toBe("video");
	});

	it("names an unknown extension so the message is concrete", () => {
		expect(videoFormat({ name: "notes.txt", type: "text/plain" })).toBe("TXT");
	});
});

describe("video file checks", () => {
	it("keeps mov and 3gp files the browser cannot preview", () => {
		expect(
			checkVideoFile({
				name: "IMG_0420.MOV",
				type: "video/quicktime",
				size: 4,
			}),
		).toEqual({ ok: true });
		expect(
			checkVideoFile({ name: "clip.3gp", type: "video/3gpp", size: 4 }),
		).toEqual({ ok: true });
	});

	it("names the format for unknown files", () => {
		const result = checkVideoFile({
			name: "notes.txt",
			type: "text/plain",
			size: 4,
		});
		expect(result).toEqual({ ok: false, kind: "format", format: "TXT" });
	});

	it("reports the real limit", () => {
		const result = checkVideoFile({
			name: "long.mp4",
			type: "video/mp4",
			size: 201 * 1024 * 1024,
		});
		expect(result).toEqual({ ok: false, kind: "size", limit: 209_715_200 });
	});
});

describe("video error classes", () => {
	it("spots memory failures", () => {
		expect(classifyVideoError(new Error("Cannot enlarge memory array"))).toBe(
			"memory",
		);
		expect(shouldRetryOnSingleThread("mt", new Error("out of memory"))).toBe(
			true,
		);
	});

	it("spots decode failures and skips the retry", () => {
		expect(
			classifyVideoError(
				new Error("ffmpeg failed with code 1: Decoder (codec hevc) not found"),
			),
		).toBe("unsupported");
		expect(
			shouldRetryOnSingleThread(
				"mt",
				new Error("ffmpeg failed with code 1: Invalid data found"),
			),
		).toBe(false);
	});

	it("only retries away from the threaded core", () => {
		expect(shouldRetryOnSingleThread("st", new Error("out of memory"))).toBe(
			false,
		);
		// an unknown job failure is not a memory failure
		expect(
			shouldRetryOnSingleThread("mt", new Error("ffmpeg failed with code 1")),
		).toBe(false);
		// a core that never started is retried whatever the message says
		expect(
			shouldRetryOnSingleThread(
				"mt",
				new FfmpegEngineError("ffmpeg core failed to load"),
			),
		).toBe(true);
	});

	it("never blames the file when the engine could not start", () => {
		const offline = new FfmpegEngineError("ffmpeg core failed to load", {
			message: "Failed to fetch",
		});
		expect(classifyFailure(offline)).toBe("engine");
		// a core that died allocating still says memory, not network
		const starved = new FfmpegEngineError("ffmpeg core failed to load", {
			message: "Cannot enlarge memory arrays",
		});
		expect(classifyFailure(starved)).toBe("memory");
		expect(classifyFailure(new Error("Cannot enlarge memory arrays"))).toBe(
			"memory",
		);
	});
});
