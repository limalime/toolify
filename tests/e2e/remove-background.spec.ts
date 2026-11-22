import { expect, test } from "@playwright/test";
import {
	downloadBytes,
	FIXTURES,
	imageAlphaStats,
	imageDims,
	signatureOf,
} from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.skip(
		test.info().project.name === "chromium-mobile",
		"the 84 MB model run stays on desktop",
	);
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/remove-background");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Background Remover",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pet]);
	await expect(
		page.getByRole("button", { name: "Remove background" }),
	).toBeEnabled();
});

test("cuts out the subject with a real alpha mask", async ({ page }) => {
	await page.getByRole("button", { name: "Remove background" }).click();
	await expect(page.getByTestId("bg-stage")).toContainText(
		/Downloading model|Cutting out/,
	);
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/-nobg\.png$/);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 640, height: 480 });
	const stats = await imageAlphaStats(page, bytes);
	// a real cutout: background erased, subject kept, a thin soft edge
	expect(stats.zeroPct).toBeGreaterThan(20);
	expect(stats.opaquePct).toBeGreaterThan(15);
	expect(stats.partialPct).toBeLessThan(30);
	expect(stats.center).toBeGreaterThan(200);
});

test("a reload reuses the model cache", async ({ page }) => {
	// the route callback is the only place worker fetches are visible.
	const fullDownloads: string[] = [];
	await page.unroute("https://bucket.toolify.bond/**");
	await routeR2(page, (key, request) => {
		if (!key.endsWith(".onnx")) {
			return;
		}
		if (request.headers().range) {
			return;
		}
		fullDownloads.push(key);
	});

	await page.getByRole("button", { name: "Remove background" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	await expect(page.getByTestId("bg-cached")).toBeVisible();
	expect(fullDownloads.length).toBeGreaterThan(0);

	// a fresh page forgets the size probe but keeps the browser cache, so
	// the model must come from storage, not the network.
	fullDownloads.length = 0;
	await page.reload();
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pet]);
	await page.getByRole("button", { name: "Remove background" }).click();
	await expect(page.getByTestId("bg-stage")).toBeVisible();
	await expect(download).toBeVisible({ timeout: 240000 });
	expect(fullDownloads).toEqual([]);
});

test("shows the error state when the model cannot load", async ({ page }) => {
	await page.unroute("https://bucket.toolify.bond/**");
	await page.route("https://bucket.toolify.bond/**", (route) =>
		route.fulfill({
			status: 404,
			headers: { "access-control-allow-origin": "*" },
			body: "missing",
		}),
	);

	await page.getByRole("button", { name: "Remove background" }).click();
	await expect(page.locator("p.text-error")).toContainText(
		"Background removal failed",
	);
	await expect(page.getByRole("button", { name: "Download" })).toBeHidden();
	await expect(page.getByTestId("bg-stage")).toBeHidden();
});
