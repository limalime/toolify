import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeVideo } from "./video";

test.beforeEach(async ({ page }) => {
	test.setTimeout(420000);
	await page.goto("/crop-video");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Cropper",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.video]);
	await expect(page.getByRole("button", { name: "Crop video" })).toBeEnabled();
});

test("crops centered to a square that plays", async ({ page }) => {
	await page.getByRole("button", { name: "1:1", exact: true }).click();
	await page.getByRole("button", { name: "Crop video" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const maxProgress = await page
		.getByTestId("video-job-status")
		.getAttribute("data-max-progress");
	expect(Number(maxProgress)).toBeGreaterThan(0);
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp4");
	const probe = await mediaProbe(page, bytes, "video/mp4");
	expect(probe.width).toBe(240);
	expect(probe.height).toBe(240);
});
