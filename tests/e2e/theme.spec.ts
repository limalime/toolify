import { expect, test } from "@playwright/test";

test("dark theme is the default", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("html")).toHaveClass(/dark/);
	await expect(
		page
			.locator("header")
			.getByRole("button", { name: "Switch to light theme" }),
	).toBeVisible();
});

test("toggle switches theme and remembers it", async ({ page }) => {
	await page.goto("/");
	await page
		.locator("header")
		.getByRole("button", { name: "Switch to light theme" })
		.click();
	await expect(page.locator("html")).not.toHaveClass(/dark/);
	await expect(
		page
			.locator("header")
			.getByRole("button", { name: "Switch to dark theme" }),
	).toBeVisible();
	await page.reload();
	await expect(page.locator("html")).not.toHaveClass(/dark/);
	await page
		.locator("header")
		.getByRole("button", { name: "Switch to dark theme" })
		.click();
	await expect(page.locator("html")).toHaveClass(/dark/);
});
