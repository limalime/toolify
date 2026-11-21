import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeVideo } from "./video";

test.beforeEach(async ({ page }) => {
	test.setTimeout(420000);
	await page.goto("/video-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Converter",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.video]);
	await expect(
		page.getByRole("button", { name: "Convert video" }),
	).toBeEnabled();
});

test("converts mp4 to playable webm", async ({ page }) => {
	await page.getByRole("combobox", { name: "Format" }).click();
	await page.getByRole("option", { name: "WEBM" }).click();
	await page.getByRole("button", { name: "Convert video" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const maxProgress = await page
		.getByTestId("video-job-status")
		.getAttribute("data-max-progress");
	expect(Number(maxProgress)).toBeGreaterThan(0);
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.webm$/);
	expect(signatureOf(bytes)).toBe("webm");
	const probe = await mediaProbe(page, bytes, "video/webm");
	expect(probe.width).toBe(320);
	expect(probe.height).toBe(240);
});
