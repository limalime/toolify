import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/audio-speed");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Audio Speed Changer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.toneMp3]);
	await expect(page.getByRole("button", { name: "Apply" })).toBeEnabled();
});

test("doubles speed and halves duration", async ({ page }) => {
	const slider = page.getByRole("slider", { name: "Speed" });
	await slider.focus();
	await page.keyboard.press("End");
	await page.getByRole("button", { name: "Apply" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(1);
	expect(probe.duration).toBeLessThan(2);
});
