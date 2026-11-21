import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeVideo } from "./video";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await page.goto("/mp4-to-mp3");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online MP4 to MP3 Converter",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.video]);
	await expect(page.getByRole("button", { name: "Extract MP3" })).toBeEnabled();
});

test("extracts playable mp3 with progress and engine note", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Extract MP3" }).click();
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
	await expect(page.getByTestId("video-core")).toContainText(
		"Multi-threaded engine",
	);
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.mp3$/);
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(2);
	expect(probe.duration).toBeLessThan(4);
});

test("the page stays interactive during extraction", async ({ page }) => {
	await page.getByRole("button", { name: "Extract MP3" }).click();
	const download = page.getByRole("button", { name: "Download" });
	let worst = 0;
	for (let index = 0; index < 60; index++) {
		const started = Date.now();
		await expect(page.evaluate(() => 41 + 1)).resolves.toBe(42);
		worst = Math.max(worst, Date.now() - started);
		if (await download.isVisible()) {
			break;
		}
	}
	await expect(download).toBeVisible({ timeout: 240000 });
	expect(worst).toBeLessThan(5000);
});

test("rejects files over the size cap", async ({ page }) => {
	writeFileSync("/tmp/huge-video.mp4", Buffer.alloc(200 * 1024 * 1024 + 1));
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles(["/tmp/huge-video.mp4"]);
	await expect(page.getByText("200 MB", { exact: false })).toBeVisible({
		timeout: 60000,
	});
});
