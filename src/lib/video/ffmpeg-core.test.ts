import { describe, expect, it } from "vitest";
import { MAX_VIDEO_BYTES, selectCore, threadCount } from "./ffmpeg-core";

describe("ffmpeg core selection", () => {
	it("picks the threaded core only when isolated, shared, and roomy", () => {
		expect(
			selectCore({
				isolated: true,
				sharedArrayBuffer: true,
				deviceMemory: 8,
			}),
		).toBe("mt");
		expect(selectCore({ isolated: false, sharedArrayBuffer: true })).toBe("st");
		expect(selectCore({ isolated: true, sharedArrayBuffer: false })).toBe("st");
		expect(selectCore({ isolated: false, sharedArrayBuffer: false })).toBe(
			"st",
		);
	});

	it("keeps the lighter core on a four gigabyte phone", () => {
		expect(
			selectCore({ isolated: true, sharedArrayBuffer: true, deviceMemory: 4 }),
		).toBe("st");
		expect(
			selectCore({ isolated: true, sharedArrayBuffer: true, deviceMemory: 2 }),
		).toBe("st");
	});

	it("uses the threaded core only when the device has room", () => {
		expect(
			selectCore({ isolated: true, sharedArrayBuffer: true, deviceMemory: 8 }),
		).toBe("mt");
		// a browser that hides deviceMemory may be an iphone, so it gets
		// the lighter core rather than a guess
		expect(
			selectCore({
				isolated: true,
				sharedArrayBuffer: true,
				deviceMemory: undefined,
			}),
		).toBe("st");
	});

	it("caps threads at two for phone memory", () => {
		expect(threadCount(16)).toBe(2);
		expect(threadCount(8)).toBe(2);
		expect(threadCount(1)).toBe(1);
		expect(threadCount(0)).toBe(1);
		expect(threadCount(Number.NaN)).toBe(1);
	});

	it("caps video files at two hundred megabytes", () => {
		expect(MAX_VIDEO_BYTES).toBe(209_715_200);
	});
});
