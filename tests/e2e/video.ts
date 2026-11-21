import { expect, type Page } from "@playwright/test";
import { routeR2 } from "./r2";

// video specs run the real r2 bytes from local staging and assert the
// page is actually isolated before touching the engine.
export async function routeVideo(page: Page): Promise<void> {
	await routeR2(page);
	expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
}
