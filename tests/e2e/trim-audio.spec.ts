import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, mediaProbe, signatureOf } from "./helpers";
import { routeR2 } from "./r2";

test.beforeEach(async ({ page }) => {
	test.setTimeout(300000);
	await routeR2(page);
	await page.goto("/trim-audio");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Audio Trimmer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.toneMp3]);
	await expect(page.getByTestId("trim-frame")).toBeVisible();
	await expect(page.getByRole("button", { name: "Trim audio" })).toBeEnabled();
});

test("drags handles and cuts the marked range", async ({ page }) => {
	const frame = page.getByTestId("trim-frame");
	const box = await frame.boundingBox();
	if (!box) {
		throw new Error("no trim frame");
	}
	const start = page.getByTestId("trim-start");
	const end = page.getByTestId("trim-end");
	await start.hover();
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.33, box.y + box.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
	await end.hover();
	await page.mouse.down();
	await page.mouse.move(box.x + box.width * 0.66, box.y + box.height / 2, {
		steps: 8,
	});
	await page.mouse.up();
	await page.getByRole("button", { name: "Trim audio" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(0.5);
	expect(probe.duration).toBeLessThan(1.5);
});
