import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/unit-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Unit Converter",
	);
});

test("converts the default length pair live", async ({ page }) => {
	await expect(page.getByTestId("unit-result")).toContainText("0.6213711922");
	await page.getByTestId("unit-value").fill("2.5");
	await expect(page.getByTestId("unit-result")).toContainText("1.553427981");
	await expect(page.getByTestId("unit-row-m")).toContainText("2,500");
});

test("switches category to temperature and swaps units", async ({ page }) => {
	await page.getByRole("tab", { name: "Temperature" }).click();
	await expect(page.getByTestId("unit-value")).toHaveValue("1");
	await page.getByTestId("unit-value").fill("100");
	await expect(page.getByTestId("unit-result")).toContainText("212");

	await page.getByTestId("unit-swap").click();
	await expect(page.getByTestId("unit-result")).toContainText("37.77777778");
});

test("shows every unit in a table", async ({ page }) => {
	await expect(page.getByTestId("unit-row-km")).toContainText("1");
	await expect(page.getByTestId("unit-row-mm")).toContainText("1,000,000");
	await page.getByTestId("unit-value").fill("0");
	await expect(page.getByTestId("unit-result")).toContainText("0");
});
