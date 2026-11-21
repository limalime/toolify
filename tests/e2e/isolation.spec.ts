import { expect, test } from "@playwright/test";

const VIDEO_SLUGS = [
	"mp4-to-mp3",
	"video-to-gif",
	"video-converter",
	"compress-video",
	"crop-video",
];

for (const slug of VIDEO_SLUGS) {
	test(`video route /${slug} carries isolation headers`, async ({
		request,
	}) => {
		for (const path of [`/${slug}`, `/id/${slug}`]) {
			const response = await request.get(path);
			expect(response.headers()["cross-origin-opener-policy"]).toBe(
				"same-origin",
			);
			expect(response.headers()["cross-origin-embedder-policy"]).toBe(
				"credentialless",
			);
		}
	});
}

test("non-video pages stay unisolated", async ({ request, page }) => {
	for (const path of ["/", "/image-converter", "/qr-code-generator"]) {
		const response = await request.get(path);
		expect(response.headers()["cross-origin-opener-policy"]).toBeUndefined();
		expect(response.headers()["cross-origin-embedder-policy"]).toBeUndefined();
	}
	await page.goto("/image-converter");
	expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(false);
});
