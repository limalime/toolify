import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

const TYPES: Record<string, string> = {
	".wasm": "application/wasm",
	".mjs": "text/javascript",
	".json": "application/json",
	".onnx": "application/octet-stream",
};

// serves the real R2 bytes from the local staging dir. the bytes are
// identical to production, only the network hop is local, since the
// bucket allows the production origin and not the test server.
export async function routeR2(
	page: Page,
	onRequest?: (key: string) => void,
): Promise<void> {
	await page.route("https://bucket.toolify.bond/**", async (route) => {
		const key = route
			.request()
			.url()
			.replace("https://bucket.toolify.bond/", "");
		onRequest?.(key);
		const dot = key.lastIndexOf(".");
		const ext = dot >= 0 ? key.slice(dot) : "";
		await route.fulfill({
			body: readFileSync(`r2-upload/${key}`),
			contentType: TYPES[ext] ?? "application/octet-stream",
		});
	});
}
