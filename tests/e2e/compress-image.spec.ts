import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/compress-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Compressor",
	);
});

test("compresses with before and after sizes", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await page.getByRole("button", { name: "Compress", exact: true }).click();
	const row = page.locator(
		"[data-testid='compress-list'] [data-status='done']",
	);
	await expect(row).toBeVisible({ timeout: 60000 });
	await expect(row).toContainText("Before");
	await expect(row).toContainText("After");
	const { bytes } = await downloadBytes(
		page,
		row.getByRole("link", { name: "Download" }),
	);
	expect(signatureOf(bytes)).toBe("png");
});

test("target size shrinks toward the goal", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await page.getByLabel("Target size (optional)").fill("20 KB");
	await page.getByRole("button", { name: "Compress", exact: true }).click();
	const row = page.locator(
		"[data-testid='compress-list'] [data-status='done']",
	);
	await expect(row).toBeVisible({ timeout: 90000 });
	const { bytes } = await downloadBytes(
		page,
		row.getByRole("link", { name: "Download" }),
	);
	expect(bytes.byteLength).toBeLessThan(50019);
});

test("rejects a bad target size inline", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await page.getByLabel("Target size (optional)").fill("huge");
	await page.getByRole("button", { name: "Compress", exact: true }).click();
	await expect(page.getByText("Enter a size like 500 KB.")).toBeVisible();
});
