import { expect, type Page, test } from "@playwright/test";
import { downloadBytes, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/barcode-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Barcode Generator",
	);
});

async function pickFormat(page: Page, label: string) {
	await page.getByRole("combobox", { name: "Type" }).click();
	await page.getByRole("option", { name: label }).click();
}

test("renders code128 with png and svg downloads", async ({ page }) => {
	await page.getByLabel("Content").fill("Hello-123");
	await expect(page.getByTestId("barcode-preview")).toBeVisible();
	const png = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(png.filename).toBe("barcode.png");
	expect(signatureOf(png.bytes)).toBe("png");
	const svg = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download SVG" }),
	);
	expect(signatureOf(svg.bytes)).toBe("svg");
	expect(new TextDecoder().decode(svg.bytes)).toContain("<rect");
});

test("validates ean13 including its checksum", async ({ page }) => {
	await pickFormat(page, "EAN13");
	await page.getByLabel("Content").fill("5901234123457");
	await expect(page.getByTestId("barcode-preview")).toBeVisible();
	await page.getByLabel("Content").fill("abc");
	await expect(
		page.getByText("These characters do not fit this barcode type."),
	).toBeVisible();
});
