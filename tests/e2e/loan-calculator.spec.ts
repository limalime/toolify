import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/loan-calculator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Loan and Mortgage Calculator",
	);
});

test("matches the hand computed payment and totals", async ({ page }) => {
	await page.getByTestId("loan-amount").fill("200000");
	await page.getByTestId("loan-rate").fill("4.5");
	await page.getByTestId("loan-years").fill("15");
	await expect(page.getByTestId("loan-payment")).toContainText("1,529.99");
	await expect(page.getByTestId("loan-totalInterest")).toContainText(
		"75,397.58",
	);
	await expect(page.getByTestId("loan-totalPaid")).toContainText("275,397.58");
});

test("lists every month and ends at zero", async ({ page }) => {
	await page.getByTestId("loan-amount").fill("200000");
	await page.getByTestId("loan-rate").fill("4.5");
	await page.getByTestId("loan-years").fill("15");
	const table = page.getByTestId("loan-table");
	await expect(table.locator("tbody tr")).toHaveCount(180);
	await expect(table.locator("tbody tr").last()).toContainText("0.00");
});

test("rejects a zero term", async ({ page }) => {
	await page.getByTestId("loan-years").fill("0");
	await expect(
		page.getByText("Use an amount above zero, a rate of zero or more"),
	).toBeVisible();
	await expect(page.getByTestId("loan-table")).toHaveCount(0);
});
