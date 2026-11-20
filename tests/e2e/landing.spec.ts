import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test("hero shows the headline, subcopy, and search", async ({ page }) => {
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Every tool you need. Free, fast, private.",
	);
	await expect(page.getByPlaceholder(/search tools/i)).toBeVisible();
	await expect(
		page.getByRole("searchbox", { name: /search tools/i }),
	).toBeVisible();
});

test("why block shows three promises", async ({ page }) => {
	for (const title of ["Free forever", "Private by design", "No signup"]) {
		await expect(page.getByRole("heading", { name: title })).toBeVisible();
	}
});

test("search filters live and clears", async ({ page }) => {
	const search = page.getByRole("searchbox", { name: /search tools/i });
	await search.fill("zzz-no-such-tool");
	await expect(
		page.getByText("No tool matches. Try another keyword."),
	).toBeVisible();
	await page.getByRole("button", { name: "Clear search" }).click();
	await expect(search).toHaveValue("");
	await expect(
		page.getByText("No tool matches. Try another keyword."),
	).toBeHidden();
});

test("menu carries no placeholder cards", async ({ page }) => {
	await expect(page.locator("body")).not.toContainText(/coming soon/i);
});

test("menu cards link to working tool pages", async ({ page }) => {
	await expect(
		page.locator("[data-tool-card='image-converter']"),
	).toBeVisible();
	await page.locator("[data-tool-card='image-converter']").click();
	await expect(page).toHaveURL(/\/image-converter\/?$/);
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Image Converter",
	);
});

test("every card links to a page that answers 200", async ({
	page,
	request,
}) => {
	const cards = page.locator("[data-tool-card]");
	const count = await cards.count();
	for (let index = 0; index < count; index++) {
		const href = await cards.nth(index).getAttribute("href");
		expect(href).toBeTruthy();
		const response = await request.get(href as string);
		expect(response.ok()).toBe(true);
	}
});

test("page fits the viewport width", async ({ page }) => {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
});
