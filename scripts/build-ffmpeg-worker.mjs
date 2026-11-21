// bundles the ffmpeg worker into one self-contained esm file for r2.
// the api itself stays a runtime import, so the bundle has no trace of it.
import { execFileSync } from "node:child_process";

const out = process.argv[2] ?? "r2-upload/ffmpeg/0.12.15/worker-impl.js";
execFileSync(
	"npx",
	[
		"-y",
		"esbuild@0.25.1",
		"src/workers/ffmpeg-worker.ts",
		"--bundle",
		"--format=esm",
		"--platform=browser",
		"--target=es2020",
		"--alias:@=./src",
		`--outfile=${out}`,
		"--log-level=warning",
	],
	{ stdio: "inherit" },
);
console.log(`ffmpeg worker bundle written to ${out}`);
