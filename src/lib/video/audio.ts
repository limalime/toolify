// pure audio ffmpeg builders plus the shared audio helpers.
export type AudioFormat = "mp3" | "wav" | "ogg" | "m4a" | "flac";

export const AUDIO_FORMATS: AudioFormat[] = [
	"mp3",
	"wav",
	"ogg",
	"m4a",
	"flac",
];

export const AUDIO_MIME: Record<AudioFormat, string> = {
	mp3: "audio/mpeg",
	wav: "audio/wav",
	ogg: "audio/ogg",
	m4a: "audio/mp4",
	flac: "audio/flac",
};

const CODEC_OF: Record<AudioFormat, string[]> = {
	mp3: ["-c:a", "libmp3lame", "-b:a", "192k"],
	wav: ["-c:a", "pcm_s16le"],
	ogg: ["-c:a", "libvorbis", "-q:a", "5"],
	m4a: ["-c:a", "aac", "-b:a", "192k"],
	flac: ["-c:a", "flac"],
};

export function audioConvertArgs(
	format: AudioFormat,
	threads: number,
): string[] {
	return [
		"-i",
		"in.audio",
		"-threads",
		String(threads),
		...CODEC_OF[format],
		`out.${format}`,
	];
}

export function audioAdjustArgs(
	bitrateKbps: number,
	sampleRate: number,
	threads: number,
): string[] {
	return [
		"-i",
		"in.audio",
		"-threads",
		String(threads),
		"-c:a",
		"libmp3lame",
		"-b:a",
		`${bitrateKbps}k`,
		"-ar",
		String(sampleRate),
		"out.mp3",
	];
}

export function audioJoinArgs(
	count: number,
	threads: number,
	format: "mp3" | "wav" = "mp3",
): string[] {
	const inputs: string[] = [];
	const chain: string[] = [];
	for (let index = 0; index < count; index++) {
		inputs.push("-i", `in${index}.audio`);
		chain.push(
			`[${index}:a]aformat=sample_rates=44100:channel_layouts=stereo[a${index}]`,
		);
	}
	const labels = Array.from(
		{ length: count },
		(_, index) => `[a${index}]`,
	).join("");
	chain.push(`${labels}concat=n=${count}:v=0:a=1`);
	const codec =
		format === "wav"
			? ["-c:a", "pcm_s16le"]
			: ["-c:a", "libmp3lame", "-b:a", "192k"];
	return [
		...inputs,
		"-threads",
		String(threads),
		"-filter_complex",
		chain.join(";"),
		...codec,
		`out.${format}`,
	];
}

export function audioTrimArgs(
	startSec: number,
	durationSec: number,
	format: AudioFormat,
	threads: number,
): string[] {
	return [
		"-ss",
		String(startSec),
		"-i",
		"in.audio",
		"-t",
		String(durationSec),
		"-threads",
		String(threads),
		...CODEC_OF[format],
		`out.${format}`,
	];
}

export function pitchRatio(semitones: number): number {
	return 2 ** (semitones / 12);
}

export function speedPitchArgs(
	speed: number,
	semitones: number,
	threads: number,
): string[] {
	const ratio = pitchRatio(semitones);
	const filters = [`atempo=${speed}`];
	if (semitones !== 0) {
		filters.push(`asetrate=44100*${ratio}`, "aresample=44100");
	}
	return [
		"-i",
		"in.audio",
		"-threads",
		String(threads),
		"-filter:a",
		filters.join(","),
		"-c:a",
		"libmp3lame",
		"-b:a",
		"192k",
		"out.mp3",
	];
}
