import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

// transformers pulls in onnxruntime-web, and the bundler copies its wasm into
// .next/static. both tools point onnxruntime at the R2 copies, so the bundled
// files are never fetched. the asyncify build is 25.6 MiB, over the Workers
// per-asset limit, so drop oversized ORT wasm before OpenNext copies static.
const MEDIA = join(".next", "static", "media");
const WORKERS_ASSET_LIMIT = 25 * 1024 * 1024;

let removed = 0;
for (const name of readdirSync(MEDIA)) {
	if (!(name.startsWith("ort-wasm-simd-threaded") && name.endsWith(".wasm"))) {
		continue;
	}
	const file = join(MEDIA, name);
	const { size } = statSync(file);
	if (size <= WORKERS_ASSET_LIMIT) {
		continue;
	}
	rmSync(file);
	console.log(`removed ${file} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
	removed += 1;
}
if (removed === 0) {
	console.log("no bundled ORT wasm over the Workers asset limit");
}
