import { describe, expect, it } from "vitest";
import {
	aspectCropBox,
	compressQualityArgs,
	compressSizeArgs,
	convertArgs,
	cropArgs,
	gifArgs,
	mp3Args,
	targetVideoBitrateKbps,
} from "./commands";

describe("ffmpeg commands", () => {
	it("extracts mp3 without video", () => {
		const args = mp3Args(192, 4);
		expect(args).toContain("-vn");
		expect(args).toContain("192k");
		expect(args.at(-1)).toBe("out.mp3");
	});

	it("builds a single-pass paletted gif", () => {
		const filter = gifArgs(15, 480, 4).join(" ");
		expect(filter).toContain("fps=15");
		expect(filter).toContain("scale=480:-1");
		expect(filter).toContain("palettegen");
		expect(filter).toContain("paletteuse");
	});

	it("converts to each container with honest codecs", () => {
		expect(convertArgs("mp4", 4)).toContain("libx264");
		expect(convertArgs("webm", 4)).toContain("libvpx");
		expect(convertArgs("mov", 4)).toContain("libx264");
		expect(convertArgs("mov", 4)).toContain("mov");
	});

	it("compresses by quality or computed bitrate", () => {
		expect(compressQualityArgs(26, 2)).toContain("26");
		expect(targetVideoBitrateKbps(1_000_000, 10, 128)).toBe(672);
		expect(() => targetVideoBitrateKbps(0, 10, 128)).toThrow("bad target");
		expect(compressSizeArgs(672, 2)).toContain("672k");
	});

	it("centers aspect crops on even edges", () => {
		expect(aspectCropBox(320, 240, 1)).toEqual({
			width: 240,
			height: 240,
			x: 40,
			y: 0,
		});
		const wide = aspectCropBox(321, 240, 16 / 9);
		expect(wide.width % 2).toBe(0);
		expect(wide.height % 2).toBe(0);
		expect(cropArgs({ width: 240, height: 240, x: 40, y: 0 }, 2)).toContain(
			"crop=240:240:40:0",
		);
	});
});
