import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/crop-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Cropper",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByTestId("crop-frame")).toBeVisible();
});

test("crops the dragged region", async ({ page }) => {
	const frame = page.getByTestId("crop-frame");
	const box = await frame.boundingBox();
	if (!box) {
		throw new Error("no crop frame");
	}
	await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75, {
		steps: 8,
	});
	await page.mouse.up();
	await page.getByRole("button", { name: "Crop image" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("png");
	const dims = await imageDims(page, bytes);
	expect(dims.width).toBeGreaterThanOrEqual(390);
	expect(dims.width).toBeLessThanOrEqual(410);
	expect(dims.height).toBeGreaterThanOrEqual(290);
	expect(dims.height).toBeLessThanOrEqual(310);
});

test("ratio preset crops a square", async ({ page }) => {
	await page.getByRole("button", { name: "1:1", exact: true }).click();
	await page.getByRole("button", { name: "Crop image" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(page, download);
	const dims = await imageDims(page, bytes);
	expect(dims.width).toBe(dims.height);
});
