import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/uuid-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online UUID Generator",
	);
});

test("generates v7 by default", async ({ page }) => {
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	const row = page.locator("button[class*='font-mono']").first();
	await expect(row).toBeVisible();
	expect(await row.textContent()).toMatch(
		/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
	);
});

test("v5 derives deterministically from namespace and name", async ({
	page,
}) => {
	await page.getByRole("combobox", { name: "Version" }).click();
	await page.getByRole("option", { name: "v5" }).click();
	await page
		.getByLabel("Namespace UUID")
		.fill("6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b");
	await page.getByLabel("Name", { exact: true }).fill("toolify");
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	const first = await page
		.locator("button[class*='font-mono']")
		.first()
		.textContent();
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	const second = await page
		.locator("button[class*='font-mono']")
		.first()
		.textContent();
	expect(first).toBe(second);
	expect(first).toMatch(/^[0-9a-f-]{36}$/i);
});

test("bulk generates and copies all", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	const slider = page.getByRole("slider", { name: "How many" });
	await slider.focus();
	await page.keyboard.press("End");
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	await expect(page.locator("button[class*='font-mono']")).toHaveCount(100);
	await page.getByRole("button", { name: "Copy all" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip.split("\n")).toHaveLength(100);
});
