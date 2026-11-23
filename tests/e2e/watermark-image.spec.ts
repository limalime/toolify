import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/watermark-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Watermark Tool",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
});

test("stamps text keeping dimensions", async ({ page }) => {
	await page.getByLabel("Watermark text").fill("SAMPLE");
	await page.getByRole("button", { name: "Apply watermark" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});

test("stamps an image mark", async ({ page }) => {
	await page.getByRole("tab", { name: "Image" }).click();
	await page
		.locator("input[type='file']")
		.nth(1)
		.setInputFiles([FIXTURES.logo]);
	await expect(page.getByText("logo.png")).toBeVisible();
	await page.getByRole("button", { name: "Apply watermark" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("png");
});

test("shows the file name and preview before applying", async ({ page }) => {
	await expect(page.getByTestId("source-name")).toHaveText("photo.png");
	await expect(
		page.locator("img[alt='photo.png']").first(),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Download" }),
	).toHaveCount(0);
});
