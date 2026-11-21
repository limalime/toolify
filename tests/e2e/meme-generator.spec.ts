import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/meme-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Meme Generator",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByTestId("meme-preview")).toBeVisible();
});

test("renders captions live and downloads the meme", async ({ page }) => {
	await page.getByLabel("Top text").fill("TOP JOKE");
	await page.getByLabel("Bottom text").fill("BOTTOM JOKE");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download meme" }),
	);
	expect(filename).toBe("photo-meme.png");
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});
