import { expect, type Page, test } from "@playwright/test";
import { downloadBytes, FIXTURES, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/image-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Converter",
	);
});

async function pickFormat(page: Page, label: string) {
	await page.getByRole("combobox", { name: "Output format" }).click();
	await page.getByRole("option", { name: label }).click();
}

test("page carries the full tool anatomy", async ({ page }) => {
	await expect(page.getByText("Drop files here or")).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Convert", exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("Files never leave your browser.").first(),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "How to use" })).toBeVisible();
	await expect(page.getByText("Drop your files")).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Frequently asked questions" }),
	).toBeVisible();
	await expect(page.locator("[data-tool-card]")).toHaveCount(4);
	await expect(
		page.getByRole("navigation", { name: "Breadcrumb" }),
	).toBeVisible();
});

test("converts png to webp with a real download", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	await pickFormat(page, "WEBP");
	await page.getByRole("button", { name: "Convert", exact: true }).click();
	const row = page.locator("[data-testid='file-list'] [data-status='done']");
	await expect(row).toBeVisible({ timeout: 60000 });
	const { bytes, filename } = await downloadBytes(
		page,
		row.getByRole("link", { name: "Download" }),
	);
	expect(filename).toMatch(/\.webp$/);
	expect(signatureOf(bytes)).toBe("webp");
});

test("converts heic input to jpg", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.heic]);
	await pickFormat(page, "JPG");
	await page.getByRole("button", { name: "Convert", exact: true }).click();
	const row = page.locator("[data-testid='file-list'] [data-status='done']");
	await expect(row).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(
		page,
		row.getByRole("link", { name: "Download" }),
	);
	expect(signatureOf(bytes)).toBe("jpg");
});

test("converts ai input to png", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.ai]);
	await pickFormat(page, "PNG");
	await page.getByRole("button", { name: "Convert", exact: true }).click();
	const row = page.locator("[data-testid='file-list'] [data-status='done']");
	await expect(row).toBeVisible({ timeout: 60000 });
	const { bytes } = await downloadBytes(
		page,
		row.getByRole("link", { name: "Download" }),
	);
	expect(signatureOf(bytes)).toBe("png");
});

test("batch converts and downloads everything as zip", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo, FIXTURES.logo]);
	await pickFormat(page, "JPG");
	await page.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(
		page.locator("[data-testid='file-list'] [data-status='done']"),
	).toHaveCount(2, {
		timeout: 90000,
	});
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download all" }),
	);
	expect(filename).toMatch(/\.zip$/);
	expect(signatureOf(bytes)).toBe("zip");
});

test("svg output explains itself", async ({ page }) => {
	await pickFormat(page, "SVG");
	await expect(page.getByText("SVG output embeds the image.")).toBeVisible();
});

for (const [label, extension, signature] of [
	["AVIF", "avif", "avif"],
	["ICO", "ico", "ico"],
	["PDF", "pdf", "pdf"],
] as const) {
	test(`converts png to ${extension}`, async ({ page }) => {
		await page
			.locator("[data-testid='dropzone'] input[type='file']")
			.setInputFiles([FIXTURES.photo]);
		await pickFormat(page, label);
		await page.getByRole("button", { name: "Convert", exact: true }).click();
		const row = page.locator("[data-testid='file-list'] [data-status='done']");
		await expect(row).toBeVisible({ timeout: 90000 });
		const { bytes, filename } = await downloadBytes(
			page,
			row.getByRole("link", { name: "Download" }),
		);
		expect(filename).toMatch(new RegExp(`\\.${extension}$`));
		expect(signatureOf(bytes)).toBe(signature);
	});
}
