import { expect, type Page, test } from "@playwright/test";
import { downloadBytes, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/qr-code-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online QR Code Generator",
	);
});

async function pickKind(page: Page, label: string) {
	await page.getByRole("combobox", { name: "Content type" }).click();
	await page.getByRole("option", { name: label }).click();
}

test("generates a text qr with png and svg downloads", async ({ page }) => {
	await page.getByLabel("Text", { exact: true }).fill("https://toolify.bond");
	await page.getByRole("button", { name: "Generate QR" }).click();
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeVisible();
	const png = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(png.filename).toBe("qr-code.png");
	expect(signatureOf(png.bytes)).toBe("png");
	const svg = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download SVG" }),
	);
	expect(svg.filename).toBe("qr-code.svg");
	expect(signatureOf(svg.bytes)).toBe("svg");
});

test("builds wifi credentials from fields", async ({ page }) => {
	await pickKind(page, "WiFi");
	await page.getByLabel("Network name").fill("my-net");
	await page.getByLabel("Password").fill("secret123");
	await page.getByRole("button", { name: "Generate QR" }).click();
	await expect(
		page.getByRole("button", { name: "Download PNG" }),
	).toBeVisible();
});

test("rejects oversized content honestly", async ({ page }) => {
	await page.getByLabel("Text", { exact: true }).fill("x".repeat(3000));
	await page.getByRole("button", { name: "Generate QR" }).click();
	await expect(page.getByText("Too long for a QR code")).toBeVisible();
});
