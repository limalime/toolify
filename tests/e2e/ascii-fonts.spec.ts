import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/ascii-fonts");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Fancy Text Generator",
	);
});

test("renders ten styles for one line", async ({ page }) => {
	await page.getByLabel("Text", { exact: true }).fill("hello");
	for (const style of [
		"bold",
		"italic",
		"boldItalic",
		"monospace",
		"script",
		"boldScript",
		"doubleStruck",
		"circled",
		"fullwidth",
		"smallCaps",
	]) {
		await expect(page.getByTestId(`font-card-${style}`)).toBeVisible();
	}
	await expect(page.getByTestId("font-card-bold")).toContainText("𝐡𝐞𝐥𝐥𝐨");
});

test("clicking a card copies its style", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByLabel("Text", { exact: true }).fill("hi");
	await page.getByTestId("font-card-circled").click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toBe("ⓗⓘ");
});
