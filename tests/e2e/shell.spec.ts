import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/");
});

test("header shows the brand, search, and language switcher", async ({
	page,
}) => {
	const header = page.locator("header");
	await expect(
		header.getByRole("link", { name: "Toolify home" }),
	).toBeVisible();
	await expect(
		header.getByRole("link", { name: "Search tools" }),
	).toBeVisible();
	await expect(header.getByRole("button", { name: "Language" })).toBeVisible();
});

test("desktop shows category links and hides the hamburger", async ({
	page,
	isMobile,
}) => {
	test.skip(!!isMobile, "desktop layout only");
	const header = page.locator("header");
	for (const label of [
		"Gambar",
		"Text",
		"Video",
		"Audio",
		"Lainnya",
		"Finance",
		"PDF and Utilities",
	]) {
		await expect(header.getByRole("link", { name: label })).toBeVisible();
	}
	await expect(header.getByRole("button", { name: "Open menu" })).toBeHidden();
});

test("mobile hides category links and shows the hamburger", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "mobile layout only");
	const header = page.locator("header");
	await expect(header.getByRole("link", { name: "Gambar" })).toBeHidden();
	await expect(header.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("hamburger opens a slide-over menu that closes", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "mobile layout only");
	await page.getByRole("button", { name: "Open menu" }).click();
	const dialog = page.getByRole("dialog", { name: "Menu" });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole("link", { name: "Finance" })).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Language" })).toBeVisible();
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
	await page.getByRole("button", { name: "Close menu" }).click();
	await expect(dialog).toBeHidden({ timeout: 3000 });
});

test("menu links reach every category anchor", async ({ page, isMobile }) => {
	test.skip(!isMobile, "mobile layout only");
	await page.getByRole("button", { name: "Open menu" }).click();
	const dialog = page.getByRole("dialog", { name: "Menu" });
	for (const href of [
		"#gambar",
		"#text",
		"#video",
		"#audio",
		"#lainnya",
		"#finance",
		"#pdf-utilities",
	]) {
		await expect(dialog.locator(`a[href='/${href}']`)).toBeVisible();
	}
});

test("language switcher lists seven locales with same-page links", async ({
	page,
}) => {
	await page
		.locator("header")
		.getByRole("button", { name: "Language" })
		.click();
	const menu = page.locator("[role='menu']");
	const expected: Array<[string, string]> = [
		["English", "/"],
		["Indonesia", "/id"],
		["Español", "/es"],
		["日本語", "/ja"],
		["中文", "/zh"],
		["Français", "/fr"],
		["العربية", "/ar"],
	];
	for (const [name, href] of expected) {
		const link = menu.locator(`a[href='${href}']`);
		await expect(link).toContainText(name);
	}
	await expect(menu.locator("a[href='/'][aria-current='true']")).toContainText(
		"English",
	);
});

test("switcher keeps the page when switching locale", async ({ page }) => {
	await page.goto("/internal/primitives");
	await page
		.locator("header")
		.getByRole("button", { name: "Language" })
		.click();
	const menu = page.locator("[role='menu']");
	await expect(menu.locator("a[href='/id/internal/primitives']")).toContainText(
		"Indonesia",
	);
	await expect(
		menu.locator("a[href='/internal/primitives'][aria-current='true']"),
	).toContainText("English");
});

test("footer links legal pages, languages, and the privacy line", async ({
	page,
}) => {
	const footer = page.locator("footer.border-t");
	for (const [name, href] of [
		["About", "/about"],
		["Contact", "/contact"],
		["Privacy", "/privacy"],
		["Terms", "/terms"],
	]) {
		await expect(footer.getByRole("link", { name })).toHaveAttribute(
			"href",
			href,
		);
	}
	const languages = footer.getByRole("navigation", { name: "Languages" });
	for (const name of [
		"English",
		"Indonesia",
		"Español",
		"日本語",
		"中文",
		"Français",
		"العربية",
	]) {
		await expect(languages.getByRole("link", { name })).toBeVisible();
	}
	await expect(footer).toContainText("Files never leave your browser.");
});

test("page fits the viewport width", async ({ page }) => {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
});
