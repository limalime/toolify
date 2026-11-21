import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/text-encodings");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Text Encodings",
	);
	await page.getByLabel("Text", { exact: true }).fill("Hi");
});

test("shows every encoding together", async ({ page }) => {
	await expect(page.getByTestId("encoding-hex")).toContainText("4869");
	await expect(page.getByTestId("encoding-base64")).toContainText("SGk=");
	await expect(page.getByTestId("encoding-base32")).toContainText("JBUQ====");
	await expect(page.getByTestId("encoding-rot13")).toContainText("Uv");
	await expect(page.getByTestId("encoding-crc32")).toContainText("4d170e0e");
});

test("clicking a row copies it", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByTestId("encoding-hex").click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toBe("4869");
});
