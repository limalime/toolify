import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/code-formatter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Code Formatter",
	);
});

test("formats and minifies json", async ({ page }) => {
	await page.getByLabel("Input").fill('{"b":2,"a":[1,2]}');
	await expect(page.getByTestId("format-output")).toContainText('"b": 2');
	await page.getByRole("tab", { name: "Minify" }).click();
	await expect(page.getByTestId("format-output")).toContainText(
		'{"b":2,"a":[1,2]}',
	);
});

test("reports xml errors with a line number", async ({ page }) => {
	await page.getByRole("tab", { name: "XML" }).click();
	await page.getByLabel("Input").fill("<root>\n<bad>\n</root>");
	await expect(
		page.getByText("Mismatched closing tag root. Line 3"),
	).toBeVisible();
});
