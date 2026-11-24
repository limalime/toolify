import { expect, test } from "@playwright/test";

// next prefetches every link in view. tool pages are worker routes, so a
// flood of prefetch rsc requests used to hit 503. links to tools now opt
// out, and this guards that they stay out.
//
// the check is a whole-page one: at both widths the page is scrolled from
// top to bottom, and no rsc request may target a tool route. plain pages
// like about and privacy are allowed to prefetch, that is normal next
// behaviour and not what broke.

const TOOL_ROUTES = [
	"image-converter",
	"png-to-jpg",
	"compress-image",
	"resize-image",
	"crop-image",
	"video-converter",
	"mp4-to-mp3",
	"pdf-merge",
	"case-converter",
	"unit-converter",
	"qr-code-generator",
];

function isToolPrefetch(url: string): boolean {
	if (!url.includes("_rsc=")) {
		return false;
	}
	const path = new URL(url).pathname;
	return TOOL_ROUTES.some(
		(route) => path === `/${route}` || path.endsWith(`/${route}`),
	);
}

for (const [label, viewport] of [
	["mobile", { width: 390, height: 844 }],
	["desktop", { width: 1280, height: 900 }],
] as const) {
	for (const start of ["/image-converter", "/"]) {
		test(`no tool prefetch from ${start} at ${label}`, async ({ page }) => {
			test.setTimeout(120000);
			await page.setViewportSize(viewport);
			const toolHits: string[] = [];
			const toolStatuses: Array<{ url: string; status: number }> = [];
			page.on("request", (request) => {
				if (isToolPrefetch(request.url())) {
					toolHits.push(request.url());
				}
			});
			page.on("response", (response) => {
				if (isToolPrefetch(response.url())) {
					toolStatuses.push({
						url: response.url(),
						status: response.status(),
					});
				}
			});
			await page.goto(start, { waitUntil: "load" });
			await page.waitForTimeout(2500);
			// walk the page so any viewport based prefetch would fire
			await page.evaluate(async () => {
				const step = window.innerHeight / 2;
				for (let y = 0; y < document.body.scrollHeight; y += step) {
					window.scrollTo(0, y);
					await new Promise((resolve) => setTimeout(resolve, 150));
				}
			});
			await page.waitForTimeout(1500);
			expect(toolHits).toEqual([]);
			expect(toolStatuses.filter((hit) => hit.status >= 500)).toEqual([]);
		});
	}
}
