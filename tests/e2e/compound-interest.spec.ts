import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/compound-interest");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Compound Interest Calculator",
	);
});

test("projects a hand checked balance and chart", async ({ page }) => {
	await page.getByTestId("compound-principal").fill("1000");
	await page.getByTestId("compound-rate").fill("5");
	await page.getByTestId("compound-years").fill("10");
	await expect(page.getByTestId("compound-stat-finalBalance")).toContainText(
		"1,647.01",
	);
	await expect(page.getByTestId("compound-stat-totalInterest")).toContainText(
		"647.01",
	);
	await expect(page.getByTestId("compound-chart")).toBeVisible();
});

test("shows the final year in the schedule table", async ({ page }) => {
	await page.getByTestId("compound-principal").fill("1000");
	await page.getByTestId("compound-rate").fill("5");
	await page.getByTestId("compound-years").fill("10");
	await page.getByText("Year by year table").click();
	const table = page.locator("details table");
	await expect(table.locator("tbody tr")).toHaveCount(11);
	await expect(table.locator("tbody tr").last()).toContainText("1,647.01");
});

test("rejects a zero starting balance", async ({ page }) => {
	await page.getByTestId("compound-principal").fill("0");
	await expect(
		page.getByText("Use a balance above zero, a rate of zero or more"),
	).toBeVisible();
	await expect(page.getByTestId("compound-chart")).toHaveCount(0);
});
