import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/join-audio");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Audio Joiner",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.toneMp3, FIXTURES.toneWav]);
	await expect(page.getByTestId("join-track-1")).toBeVisible();
});

test("reorders by drag and joins the sum", async ({ page }) => {
	await expect(page.getByTestId("join-track-0")).toContainText("tone.mp3");
	await page
		.getByTestId("join-track-1")
		.dragTo(page.getByTestId("join-track-0"));
	await expect(page.getByTestId("join-track-0")).toContainText("tone.wav");
	await page.getByRole("button", { name: "Join audio" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toBe("joined.mp3");
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(5);
	expect(probe.duration).toBeLessThan(7);
});
