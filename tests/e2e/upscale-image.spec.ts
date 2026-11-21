import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/upscale-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Upscaler",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(
		page.getByRole("button", { name: "Upscale image" }),
	).toBeEnabled();
});

test("upscales 4x with progress and device note", async ({ page }) => {
	await page.getByRole("button", { name: "Upscale image" }).click();
	await expect(page.getByTestId("upscale-stage")).toContainText(
		/Downloading model|Upscaling/,
	);
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	await expect(page.getByText(/Ran on (WebGPU|CPU)/)).toBeVisible();
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/-4x\.png$/);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 3200, height: 2400 });
});

test("upscales 2x honestly and rejects oversized input", async ({ page }) => {
	await page.getByRole("tab", { name: "2x" }).click();
	await page.getByRole("button", { name: "Upscale image" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const half = await downloadBytes(page, download);
	expect(half.filename).toMatch(/-2x\.png$/);
	expect(await imageDims(page, half.bytes)).toEqual({
		width: 1600,
		height: 1200,
	});
	await page.getByRole("tab", { name: "4x" }).click();
	await page.getByRole("button", { name: "Upscale image" }).click();
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes } = await downloadBytes(page, download);
	writeFileSync("/tmp/upscaled-big.png", bytes);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles(["/tmp/upscaled-big.png"]);
	await expect(page.getByText("2048 px, 4 MP", { exact: false })).toBeVisible();
});
