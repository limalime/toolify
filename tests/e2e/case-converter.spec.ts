import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/case-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Case Converter",
	);
	await page.getByLabel("Text", { exact: true }).fill("hello world");
});

test("converts every case", async ({ page }) => {
	await expect(page.getByTestId("case-card-upper")).toContainText(
		"HELLO WORLD",
	);
	await expect(page.getByTestId("case-card-title")).toContainText(
		"Hello World",
	);
	await expect(page.getByTestId("case-card-camel")).toContainText("helloWorld");
	await expect(page.getByTestId("case-card-snake")).toContainText(
		"hello_world",
	);
	await expect(page.getByTestId("case-card-kebab")).toContainText(
		"hello-world",
	);
});

test("clicking a card copies it", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByTestId("case-card-snake").click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toBe("hello_world");
});
