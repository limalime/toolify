import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/meme-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Meme Generator",
	);
	await expect(page.getByTestId("meme-preview")).toBeVisible();
});

test("picks a template, adds a text layer, and downloads the meme", async ({
	page,
}) => {
	await page
		.getByRole("button", { name: "Template 1", exact: true })
		.click();
	await page.getByRole("button", { name: "Add text" }).click();
	await page.getByLabel("Text", { exact: true }).fill("TOP JOKE");
	await expect(page.getByTestId("meme-preview")).toContainText("TOP JOKE");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download meme" }),
	);
	expect(filename).toBe("spongebob-four-panels-meme.png");
	expect(signatureOf(bytes)).toBe("png");
});

test("uses an uploaded background and keeps its file name", async ({
	page,
}) => {
	await page
		.locator("input[type='file']")
		.first()
		.setInputFiles([FIXTURES.photo]);
	await page.getByRole("button", { name: "Add text" }).click();
	await page.getByLabel("Text", { exact: true }).fill("JUST WORKS");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download meme" }),
	);
	expect(filename).toBe("photo-meme.png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});

test("adds an image layer on top of the template", async ({ page }) => {
	await page
		.getByRole("button", { name: "Template 1", exact: true })
		.click();
	await page
		.locator("input[type='file']")
		.nth(1)
		.setInputFiles([FIXTURES.logo]);
	await expect(
		page.getByTestId("meme-preview").getByRole("img", { name: "logo.png" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Remove layer" }),
	).toBeVisible();
});
