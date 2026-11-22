import type { Page, Request } from "@playwright/test";

export const R2_STAGING = "http://127.0.0.1:8092";

// points R2 at the local staging server, which serves the same bytes. the
// redirect keeps large model files out of route.fulfill, where an 88 MB body
// kills the tab. the callback sees worker fetches, page events do not.
export async function routeR2(
	page: Page,
	onRequest?: (key: string, request: Request) => void,
): Promise<void> {
	await page.route("https://bucket.toolify.bond/**", async (route) => {
		const key = route
			.request()
			.url()
			.replace("https://bucket.toolify.bond/", "");
		onRequest?.(key, route.request());
		await route.fulfill({
			status: 302,
			headers: {
				location: `${R2_STAGING}/${key}`,
				"Access-Control-Allow-Origin": "*",
			},
		});
	});
}
