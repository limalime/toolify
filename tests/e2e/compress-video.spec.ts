import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeVideo } from "./video";

test.beforeEach(async ({ page }) => {
	test.setTimeout(420000);
	await page.goto("/compress-video");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Compressor",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.video]);
	await expect(
		page.getByRole("button", { name: "Compress video" }),
	).toBeEnabled();
});

test("compresses by quality with before and after", async ({ page }) => {
	await page.getByRole("button", { name: "Compress video" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const maxProgress = await page
		.getByTestId("video-job-status")
		.getAttribute("data-max-progress");
	expect(Number(maxProgress)).toBeGreaterThan(0);
	await expect(page.getByText("Before:")).toBeVisible();
	await expect(page.getByText("After:")).toBeVisible();
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp4");
	const probe = await mediaProbe(page, bytes, "video/mp4");
	expect(probe.duration).toBeGreaterThan(2);
});

test("compresses toward a target size", async ({ page }) => {
	await page.getByRole("tab", { name: "Target size" }).click();
	await page.getByLabel("Target size").fill("100 KB");
	await page.getByRole("button", { name: "Compress video" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const maxProgress = await page
		.getByTestId("video-job-status")
		.getAttribute("data-max-progress");
	expect(Number(maxProgress)).toBeGreaterThan(0);
	const { bytes } = await downloadBytes(page, download);
	expect(bytes.byteLength).toBeLessThan(200000);
});
