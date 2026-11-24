// Builds the phone-shaped video fixtures the video specs need. Most are
// gitignored because one of them is tens of megabytes, so specs skip
// themselves when those files are absent. The small repeat clip ships in
// the repo because it is tens of kilobytes. Requires ffmpeg on PATH.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "tests", "fixtures", "generated");
mkdirSync(dir, { recursive: true });

function run(args) {
	execFileSync(
		"ffmpeg",
		["-hide_banner", "-loglevel", "error", "-y", ...args],
		{
			stdio: "inherit",
		},
	);
}

function makeAt(path, args) {
	if (existsSync(path)) {
		console.log("have", path, statSync(path).size);
		return;
	}
	run(args.concat(path));
	console.log("wrote", path, statSync(path).size);
}

function make(name, args) {
	makeAt(join(dir, name), args);
}

try {
	execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
	console.log("ffmpeg not found, skipping phone fixtures");
	process.exit(0);
}

// portrait hevc in a mov container, the iphone default
make("phone-hevc.mov", [
	"-f",
	"lavfi",
	"-i",
	"testsrc2=size=540x960:rate=24:duration=3",
	"-f",
	"lavfi",
	"-i",
	"sine=frequency=440:duration=3",
	"-c:v",
	"libx265",
	"-tag:v",
	"hvc1",
	"-pix_fmt",
	"yuv420p",
	"-c:a",
	"aac",
	"-b:a",
	"48k",
	"-movflags",
	"+faststart",
]);

// old nokia style 3gp with h263 video
make("phone-h263.3gp", [
	"-f",
	"lavfi",
	"-i",
	"testsrc2=size=176x144:rate=12:duration=3",
	"-f",
	"lavfi",
	"-i",
	"sine=frequency=440:duration=3",
	"-c:v",
	"h263",
	"-c:a",
	"aac",
	"-b:a",
	"24k",
	"-ar",
	"8000",
	"-ac",
	"1",
]);

// a long 1080p clip at a phone-like bitrate, roughly 40 MB
make("phone-1080p.mp4", [
	"-f",
	"lavfi",
	"-i",
	"testsrc2=size=1920x1080:rate=30:duration=30",
	"-f",
	"lavfi",
	"-i",
	"sine=frequency=440:duration=30",
	"-c:v",
	"libx264",
	"-preset",
	"ultrafast",
	"-b:v",
	"11M",
	"-pix_fmt",
	"yuv420p",
	"-c:a",
	"aac",
	"-b:a",
	"96k",
	"-movflags",
	"+faststart",
]);

// the clip the repeat conversion spec uses. small enough to commit, and
// the same shape as the report that started this test: 256x300 h264,
// just over two seconds.
makeAt(join(here, "..", "tests", "fixtures", "phone-repeat.mp4"), [
	"-f",
	"lavfi",
	"-i",
	"testsrc2=size=256x300:rate=24:duration=2.29",
	"-f",
	"lavfi",
	"-i",
	"sine=frequency=330:duration=2.29",
	"-c:v",
	"libx264",
	"-profile:v",
	"baseline",
	"-level",
	"3.0",
	"-pix_fmt",
	"yuv420p",
	"-b:v",
	"90k",
	"-c:a",
	"aac",
	"-b:a",
	"48k",
	"-movflags",
	"+faststart",
]);
