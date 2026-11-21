import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.skip(
		test.info().project.name === "chromium-mobile",
		"the 56 MB model run stays on desktop",
	);
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/remove-background");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Background Remover",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(
		page.getByRole("button", { name: "Remove background" }),
	).toBeEnabled();
});

test("cuts out with honest progress and device note", async ({ page }) => {
	await page.getByRole("button", { name: "Remove background" }).click();
	await expect(page.getByTestId("bg-stage")).toContainText(
		/Downloading model|Cutting out/,
	);
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	await expect(page.getByText(/Ran on (WebGPU|CPU)/)).toBeVisible();
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/-nobg\.png$/);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});

test("second run reuses the cache without new downloads", async ({ page }) => {
	let downloads = 0;
	await page.unroute("https://bucket.toolify.bond/**");
	await routeR2(page, () => {
		downloads += 1;
	});
	await page.getByRole("button", { name: "Remove background" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const firstRun = downloads;
	expect(firstRun).toBeGreaterThan(0);
	await page.getByRole("button", { name: "Remove background" }).click();
	await expect(page.getByTestId("bg-cached")).toBeVisible({ timeout: 240000 });
	expect(downloads).toBe(firstRun);
});
