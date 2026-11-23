import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/ascii-art");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online ASCII Art Generator",
	);
	await page.getByLabel("Text", { exact: true }).fill("Hi");
	await expect(page.getByTestId("ascii-preview")).not.toBeEmpty();
});

test("renders a banner and downloads txt", async ({ page }) => {
	const before = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	expect(before).toContain("\n");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download" }),
	);
	expect(filename).toBe("ascii-art.txt");
	expect(new TextDecoder().decode(bytes)).toBe(before);
});

test("switching fonts changes the banner", async ({ page }) => {
	const before = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	await page.getByRole("combobox", { name: "Font" }).click();
	await page.getByRole("option", { name: "Slant" }).click();
	const after = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	expect(after).not.toBe(before);
	expect(after.length).toBeGreaterThan(0);
});

test("converts an image to ascii and exports a png", async ({ page }) => {
	await page.getByRole("tab", { name: "Image" }).click();
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	const canvas = page.getByTestId("ascii-image-preview");
	await expect(canvas).toBeVisible({ timeout: 30000 });
	const before = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
	await page.getByRole("combobox", { name: "Style" }).click();
	await page.getByRole("option", { name: "Matrix" }).click();
	const after = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
	expect(after).not.toBe(before);
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(filename).toBe("photo-ascii.png");
	expect(signatureOf(bytes)).toBe("png");
	expect((await imageDims(page, bytes)).width).toBeGreaterThan(0);
});
