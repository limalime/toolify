import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// pdf.js loads fonts, cmaps, wasm decoders and colour profiles at runtime.
// they have to sit next to the worker file, so copy them from the package
// on every build and keep public/pdfjs in step with the installed version.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "node_modules", "pdfjs-dist");
const target = join(root, "public", "pdfjs");

const folders = ["standard_fonts", "cmaps", "wasm", "iccs"];

await mkdir(target, { recursive: true });
for (const folder of folders) {
	await cp(join(source, folder), join(target, folder), { recursive: true });
}
console.log(`pdfjs assets synced (${folders.join(", ")})`);