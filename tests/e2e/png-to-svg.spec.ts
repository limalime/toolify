import { expect, type Page, test } from "@playwright/test";
import { downloadBytes, FIXTURES, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	test.setTimeout(240000);
	await page.goto("/png-to-svg");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online PNG to SVG Tracer",
	);
});

async function ready(page: Page) {
	await expect(
		page.getByRole("button", { name: "Trace to SVG" }),
	).toBeEnabled();
}

test("traces a logo into real vectors", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.logo]);
	await ready(page);
	await page.getByRole("button", { name: "Trace to SVG" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 180000 });
	await expect(page.getByText("SVG size")).toBeVisible();
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.svg$/);
	expect(signatureOf(bytes)).toBe("svg");
	expect(new TextDecoder().decode(bytes)).toContain("<path");
});

test("warns honestly on a photo", async ({ page }) => {
	test.slow();
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await ready(page);
	await expect(
		page.getByText("Huge output for a detailed image."),
	).toBeVisible();
	await page.getByRole("button", { name: "Trace to SVG" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 240000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("svg");
});
