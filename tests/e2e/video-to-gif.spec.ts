import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";
import { routeVideo } from "./video";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await page.goto("/video-to-gif");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video to GIF Converter",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.video]);
	await expect(page.getByRole("button", { name: "Make GIF" })).toBeEnabled();
});

test("makes a sized gif with progress", async ({ page }) => {
	await page.getByRole("button", { name: "Make GIF" }).click();
	await expect(
		page
			.getByText("Loading video engine…")
			.or(page.getByRole("button", { name: "Download" })),
	).toBeVisible();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const maxProgress = await page
		.getByTestId("video-job-status")
		.getAttribute("data-max-progress");
	expect(Number(maxProgress)).toBeGreaterThan(0);
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.gif$/);
	expect(signatureOf(bytes)).toBe("gif");
	expect(await imageDims(page, bytes)).toEqual({ width: 480, height: 360 });
});
