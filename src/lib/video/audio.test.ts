import { describe, expect, it } from "vitest";
import {
	AUDIO_FORMATS,
	audioAdjustArgs,
	audioConvertArgs,
	audioJoinArgs,
	audioTrimArgs,
	pitchRatio,
	speedPitchArgs,
} from "./audio";

describe("audio commands", () => {
	it("converts with honest codecs per format", () => {
		expect(audioConvertArgs("mp3", 1)).toContain("libmp3lame");
		expect(audioConvertArgs("wav", 1)).toContain("pcm_s16le");
		expect(audioConvertArgs("ogg", 1)).toContain("libvorbis");
		expect(audioConvertArgs("m4a", 1)).toContain("aac");
		expect(audioConvertArgs("flac", 1)).toContain("flac");
		expect(AUDIO_FORMATS).toHaveLength(5);
	});

	it("adjusts bitrate and sample rate", () => {
		const args = audioAdjustArgs(256, 48000, 1);
		expect(args).toContain("256k");
		expect(args).toContain("48000");
	});

	it("joins normalized streams", () => {
		const filter = audioJoinArgs(3, 1).join(" ");
		expect(filter).toContain("concat=n=3");
		expect(filter).toContain("aformat");
		expect(audioJoinArgs(2, 1, "wav").at(-1)).toBe("out.wav");
	});

	it("trims with seek and duration", () => {
		const args = audioTrimArgs(1.5, 2, "wav", 1);
		expect(args.slice(0, 5)).toEqual(["-ss", "1.5", "-i", "in.audio", "-t"]);
		expect(args).toContain("out.wav");
	});

	it("maps semitones to ratios", () => {
		expect(pitchRatio(0)).toBe(1);
		expect(pitchRatio(12)).toBeCloseTo(2, 5);
		expect(pitchRatio(-12)).toBeCloseTo(0.5, 5);
		const args = speedPitchArgs(1.5, 0, 1).join(" ");
		expect(args).toContain("atempo=1.5");
		expect(args).not.toContain("asetrate");
		const pitched = speedPitchArgs(1, 7, 1).join(" ");
		expect(pitched).toContain("asetrate");
		expect(pitched).toContain("aresample");
	});
});
