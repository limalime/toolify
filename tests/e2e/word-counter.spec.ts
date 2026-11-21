import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/word-counter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Word Counter",
	);
});

test("counts live as you type", async ({ page }) => {
	await page
		.getByLabel("Text", { exact: true })
		.fill("Hello world. How are you?");
	await expect(page.getByTestId("count-words")).toContainText("5");
	await expect(page.getByTestId("count-characters")).toContainText("25");
	await expect(page.getByTestId("count-sentences")).toContainText("2");
	await expect(page.getByTestId("count-readingTime")).toContainText("2s");
	await page.getByLabel("Text", { exact: true }).fill("one");
	await expect(page.getByTestId("count-words")).toContainText("1");
});
