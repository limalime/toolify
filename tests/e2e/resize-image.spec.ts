import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/resize-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Resizer",
	);
});

test("resizes by pixels with the ratio locked", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByTestId("resize-dims")).toContainText("800 × 600");
	await page.getByLabel("Width", { exact: true }).fill("400");
	await expect(page.getByLabel("Height", { exact: true })).toHaveValue("300");
	await page.getByRole("button", { name: "Resize image" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const trigger = page.locator("img[alt$='.png']").first();
	await expect(trigger).toBeVisible();
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 400, height: 300 });
});

test("resizes by percent", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByTestId("resize-dims")).toBeVisible();
	await page.getByRole("tab", { name: "Percent" }).click();
	const slider = page.getByRole("slider", { name: "Percent" });
	await slider.focus();
	await page.keyboard.press("ArrowLeft");
	await page.keyboard.press("ArrowLeft");
	const output = await page.locator("output").textContent();
	const percent = Number.parseInt(output ?? "", 10);
	expect(percent).toBeLessThan(100);
	await page.getByRole("button", { name: "Resize image" }).click();
	await expect(page.getByRole("button", { name: "Download" })).toBeVisible({
		timeout: 60000,
	});
});
