import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/password-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Password Generator",
	);
});

test("generates at length with an honest meter", async ({ page }) => {
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	const output = page.getByTestId("password-output");
	await expect(output).not.toBeEmpty();
	expect((await output.textContent())?.length).toBe(20);
	await expect(page.getByTestId("password-strength")).toContainText(
		"Excellent",
	);
});

test("character sets constrain the pool", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	for (const label of ["Lowercase", "Uppercase", "Symbols"]) {
		await page.getByRole("switch", { name: label }).click();
	}
	await page.getByRole("button", { name: "Generate", exact: true }).click();
	const output = page.getByTestId("password-output");
	expect(await output.textContent()).toMatch(/^[0-9]+$/);
	await page.getByRole("button", { name: "Copy" }).click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toMatch(/^[0-9]+$/);
});
