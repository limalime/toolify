import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/enhance-image");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Enhancer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByTestId("enhance-preview")).toBeVisible();
});

test("applies sliders and downloads at full size", async ({ page }) => {
	const slider = page.getByRole("slider", { name: "Brightness" });
	await slider.focus();
	for (let index = 0; index < 5; index++) {
		await page.keyboard.press("ArrowRight");
	}
	await page.getByRole("button", { name: "Enhance image" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});

test("reset returns sliders to neutral", async ({ page }) => {
	const slider = page.getByRole("slider", { name: "Contrast" });
	await slider.focus();
	await page.keyboard.press("ArrowRight");
	await page.getByRole("button", { name: "Reset" }).click();
	await expect(page.getByRole("slider", { name: "Contrast" })).toHaveValue("0");
});

test("says plainly it is not ai", async ({ page }) => {
	await page.getByText("Is this AI enhancement?").click();
	await expect(
		page.getByText("Nothing is invented", { exact: false }),
	).toBeVisible();
});
