import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/audio-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Audio Converter",
	);
	expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(false);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.toneWav]);
	await expect(
		page.getByRole("button", { name: "Convert audio" }),
	).toBeEnabled();
});

test("converts wav to playable mp3 on the fallback core", async ({ page }) => {
	await page.getByRole("button", { name: "Convert audio" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	await expect(page.getByTestId("video-core")).toContainText(
		"Compatibility engine",
	);
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.mp3$/);
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(2);
});
