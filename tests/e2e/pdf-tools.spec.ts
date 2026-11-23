import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, signatureOf } from "./helpers";

test("pdf viewer renders a pdf and zooms", async ({ page }) => {
	await page.goto("/pdf-viewer");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online PDF Viewer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pdf]);
	const canvas = page.getByTestId("pdf-page");
	await expect(canvas).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole("spinbutton", { name: /Page/ })).toHaveValue("1");
	await expect(page.getByText("110%")).toBeVisible();
	await page.getByRole("button", { name: "Zoom in" }).click();
	await expect(page.getByText("130%")).toBeVisible();
	await page.getByRole("button", { name: "Close file" }).click();
	await expect(page.getByTestId("pdf-page")).toBeHidden();
});

test("pdf compressor reports honest sizes and downloads", async ({ page }) => {
	test.setTimeout(180_000);
	await page.goto("/pdf-compressor");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free PDF Compressor",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pdf]);
	await page.getByRole("combobox", { name: "Quality" }).click();
	await page.getByRole("option", { name: /Low/ }).click();
	await page.getByRole("button", { name: "Compress PDF" }).click();
	const result = page.getByTestId("compress-result");
	await expect(result).toBeVisible({ timeout: 120_000 });
	await expect(result).toContainText("Before");
	await expect(result).toContainText("After");
	await expect(result).toContainText("Pages");
	await expect(result).toContainText(/% (smaller|larger)|almost the same/i);
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PDF" }),
	);
	expect(filename).toBe("sample-compressed.pdf");
	expect(signatureOf(bytes)).toBe("pdf");
});