import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/percentage-calculator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Percentage Calculator",
	);
});

test("finds a percent of a number", async ({ page }) => {
	await expect(page.getByTestId("pct-of-result")).toHaveText("36");
	await page.getByTestId("pct-of-percent").fill("20");
	await page.getByTestId("pct-of-value").fill("250");
	await expect(page.getByTestId("pct-of-result")).toHaveText("50");
});

test("reports both directions of a percent change", async ({ page }) => {
	await page.getByRole("tab", { name: "Percent change" }).click();
	await expect(page.getByTestId("pct-change-result")).toHaveText("25%");
	await expect(page.getByText("This is an increase.")).toBeVisible();
	await page.getByTestId("pct-change-from").fill("100");
	await page.getByTestId("pct-change-to").fill("80");
	await expect(page.getByTestId("pct-change-result")).toHaveText("-20%");
	await expect(page.getByText("This is a decrease.")).toBeVisible();
});

test("explains a change from zero", async ({ page }) => {
	await page.getByRole("tab", { name: "Percent change" }).click();
	await page.getByTestId("pct-change-from").fill("0");
	await expect(
		page.getByText("Change from zero has no percentage."),
	).toBeVisible();
});

test("applies an increase and a decrease at once", async ({ page }) => {
	await page.getByRole("tab", { name: "Increase or decrease" }).click();
	await expect(page.getByTestId("pct-increased")).toHaveText("220");
	await expect(page.getByTestId("pct-decreased")).toHaveText("180");
});
