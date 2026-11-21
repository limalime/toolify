import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES, selectCore, threadCount } from "./ffmpeg-core";

describe("ffmpeg core selection", () => {
	it("picks multithreaded only when isolated with shared memory", () => {
		expect(selectCore({ isolated: true, sharedArrayBuffer: true })).toBe("mt");
		expect(selectCore({ isolated: false, sharedArrayBuffer: true })).toBe("st");
		expect(selectCore({ isolated: true, sharedArrayBuffer: false })).toBe("st");
		expect(selectCore({ isolated: false, sharedArrayBuffer: false })).toBe(
			"st",
		);
	});

	it("caps threads between one and four", () => {
		expect(threadCount(16)).toBe(4);
		expect(threadCount(2)).toBe(2);
		expect(threadCount(0)).toBe(1);
		expect(threadCount(Number.NaN)).toBe(1);
	});

	it("caps video files at two hundred megabytes", () => {
		expect(MAX_VIDEO_BYTES).toBe(209_715_200);
	});
});
