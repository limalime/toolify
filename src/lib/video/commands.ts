// pure ffmpeg argument builders. every tool constructs its command
// here so the exact flags stay unit tested.
export function mp3Args(bitrateKbps: number, threads: number): string[] {
	return [
		"-i",
		"in.mp4",
		"-threads",
		String(threads),
		"-vn",
		"-b:a",
		`${bitrateKbps}k`,
		"out.mp3",
	];
}

export function gifArgs(fps: number, width: number, threads: number): string[] {
	return [
		"-i",
		"in.mp4",
		"-threads",
		String(threads),
		"-vf",
		`fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse`,
		"out.gif",
	];
}

export type VideoContainer = "mp4" | "webm" | "mov";

export function convertArgs(
	container: VideoContainer,
	threads: number,
): string[] {
	const input = (name: string): string[] => ["-i", name];
	switch (container) {
		case "mp4":
			return [
				...input("in.mp4"),
				"-threads",
				String(threads),
				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-crf",
				"23",
				"-c:a",
				"aac",
				"-movflags",
				"+faststart",
				"out.mp4",
			];
		case "webm":
			// vp8, not vp9: vp9 deadlocks under threaded wasm while vp8
			// finishes in seconds with universal playback.
			return [
				...input("in.mp4"),
				"-threads",
				String(threads),
				"-c:v",
				"libvpx",
				"-b:v",
				"0",
				"-crf",
				"10",
				"-c:a",
				"libopus",
				"out.webm",
			];
		case "mov":
			return [
				...input("in.mp4"),
				"-threads",
				String(threads),
				"-c:v",
				"libx264",
				"-preset",
				"veryfast",
				"-crf",
				"23",
				"-c:a",
				"aac",
				"-f",
				"mov",
				"out.mov",
			];
	}
}

export function compressQualityArgs(crf: number, threads: number): string[] {
	return [
		"-i",
		"in.mp4",
		"-threads",
		String(threads),
		"-c:v",
		"libx264",
		"-preset",
		"veryfast",
		"-crf",
		String(crf),
		"-c:a",
		"aac",
		"-b:a",
		"128k",
		"-movflags",
		"+faststart",
		"out.mp4",
	];
}

// reserves audio bits first, then spreads the rest over the duration.
export function targetVideoBitrateKbps(
	targetBytes: number,
	durationSec: number,
	audioKbps: number,
): number {
	if (!(durationSec > 0) || !(targetBytes > 0)) {
		throw new Error("bad target");
	}
	const total = (targetBytes * 8) / durationSec / 1000;
	return Math.max(100, Math.floor(total - audioKbps));
}

export function compressSizeArgs(videoKbps: number, threads: number): string[] {
	return [
		"-i",
		"in.mp4",
		"-threads",
		String(threads),
		"-c:v",
		"libx264",
		"-preset",
		"veryfast",
		"-b:v",
		`${videoKbps}k`,
		"-c:a",
		"aac",
		"-b:a",
		"128k",
		"-movflags",
		"+faststart",
		"out.mp4",
	];
}

export interface CropBox {
	width: number;
	height: number;
	x: number;
	y: number;
}

// largest centered box at the given ratio, even edges for h264.
export function aspectCropBox(
	inWidth: number,
	inHeight: number,
	ratio: number,
): CropBox {
	let width = inWidth;
	let height = Math.round(width / ratio);
	if (height > inHeight) {
		height = inHeight;
		width = Math.round(height * ratio);
	}
	width -= width % 2;
	height -= height % 2;
	return {
		width: Math.max(2, width),
		height: Math.max(2, height),
		x: Math.max(0, Math.floor((inWidth - width) / 2)),
		y: Math.max(0, Math.floor((inHeight - height) / 2)),
	};
}

export function cropArgs(box: CropBox, threads: number): string[] {
	return [
		"-i",
		"in.mp4",
		"-threads",
		String(threads),
		"-vf",
		`crop=${box.width}:${box.height}:${box.x}:${box.y}`,
		"-c:a",
		"copy",
		"out.mp4",
	];
}
