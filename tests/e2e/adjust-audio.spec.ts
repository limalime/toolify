import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/adjust-audio");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Audio Adjuster",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.toneMp3]);
	await expect(
		page.getByRole("button", { name: "Adjust audio" }),
	).toBeEnabled();
});

test("adjusts bitrate and sample rate", async ({ page }) => {
	await page.getByRole("combobox", { name: "Bitrate" }).click();
	await page.getByRole("option", { name: "256k" }).click();
	await page.getByRole("combobox", { name: "Sample rate" }).click();
	await page.getByRole("option", { name: "48000" }).click();
	await page.getByRole("button", { name: "Adjust audio" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toContain("256k-48000");
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(2);
});
