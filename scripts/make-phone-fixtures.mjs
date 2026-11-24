// Builds the phone-shaped video fixtures the video specs need. These are
// gitignored because one of them is tens of megabytes. Requires ffmpeg on
// PATH, specs skip themselves when the files are absent.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "tests", "fixtures", "generated");
mkdirSync(dir, { recursive: true });

function run(args) {
	execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], {
		stdio: "inherit",
	});
}

function make(name, args) {
	const path = join(dir, name);
	if (existsSync(path)) {
		console.log("have", name, statSync(path).size);
		return;
	}
	run(args.concat(path));
	console.log("wrote", name, statSync(path).size);
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
