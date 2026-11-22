import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const ROOT = resolve("r2-upload");
const PORT = 8092;

const TYPES = {
	".mjs": "text/javascript; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".wasm": "application/wasm",
	".onnx": "application/octet-stream",
};

// mirrors the bucket for tests. the bytes are the same ones playwright would
// otherwise fulfill in memory, but an 88 MB body through route.fulfill kills
// the tab, so large model files stream from here instead.
createServer((request, response) => {
	const headers = { "access-control-allow-origin": "*" };
	let file;
	try {
		const pathname = decodeURIComponent(
			new URL(request.url ?? "/", "http://localhost").pathname,
		);
		file = resolve(ROOT, `.${pathname}`);
	} catch {
		response.writeHead(400, headers);
		response.end("bad path");
		return;
	}
	if (file !== ROOT && !file.startsWith(`${ROOT}${sep}`)) {
		response.writeHead(404, headers);
		response.end("not found");
		return;
	}
	let size;
	try {
		const stat = statSync(file);
		if (!stat.isFile()) {
			response.writeHead(404, headers);
			response.end("not found");
			return;
		}
		size = stat.size;
	} catch {
		response.writeHead(404, headers);
		response.end("not found");
		return;
	}
	const type = TYPES[extname(file)] ?? "application/octet-stream";
	// transformers probes each model file with bytes=0-0 for its size. r2
	// answers 206, so the staging server does too, or the probe would pull
	// the whole 88 MB twice.
	const range = request.headers.range;
	const match = range?.match(/^bytes=(\d+)-(\d*)$/);
	if (match) {
		const start = Number(match[1]);
		const end = match[2] ? Number(match[2]) : size - 1;
		response.writeHead(206, {
			...headers,
			"content-type": type,
			"content-range": `bytes ${start}-${end}/${size}`,
			"accept-ranges": "bytes",
			"content-length": end - start + 1,
		});
		createReadStream(file, { start, end }).pipe(response);
		return;
	}
	response.writeHead(200, {
		...headers,
		"content-type": type,
		"content-length": size,
		"accept-ranges": "bytes",
	});
	createReadStream(file).pipe(response);
}).listen(PORT, "127.0.0.1", () => console.log(`r2 staging on ${PORT}`));
