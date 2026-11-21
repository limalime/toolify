import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/base64-url-encoder");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Base64 and URL Encoder",
	);
});

test("encodes base64 and copies it", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByLabel("Input").fill("hello");
	await expect(page.getByTestId("codec-output")).toContainText("aGVsbG8=");
	await page.getByRole("button", { name: "Copy" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toBe("aGVsbG8=");
});

test("decodes urls and rejects bad input", async ({ page }) => {
	await page.getByRole("tab", { name: "URL" }).click();
	await page.getByRole("tab", { name: "Decode" }).click();
	await page.getByLabel("Input").fill("hello%20world");
	await expect(page.getByTestId("codec-output")).toContainText("hello world");
	await page.getByLabel("Input").fill("%E0%A4%A");
	await expect(
		page.getByText("This is not valid encoded input."),
	).toBeVisible();
});
