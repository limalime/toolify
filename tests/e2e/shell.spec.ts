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

test("brand shows the mark on mobile and the wordmark on desktop", async ({
	page,
	isMobile,
}) => {
	const brand = page
		.locator("header")
		.getByRole("link", { name: "Toolify home" });
	const mark = brand.locator('img[src*="logo-blue-square"]');
	const wordmark = brand.locator('img[src*="wordmark-white"]');
	if (isMobile) {
		await expect(mark).toBeVisible();
		await expect(wordmark).toBeHidden();
	} else {
		await expect(mark).toBeHidden();
		await expect(wordmark).toBeVisible();
	}
});

test("desktop shows category links and hides the hamburger", async ({
	page,
	isMobile,
}) => {
	test.skip(!!isMobile, "desktop layout only");
	const header = page.locator("header");
	for (const label of [
		"Image",
		"Text",
		"Video",
		"Audio",
		"Other",
		"Finance",
		"PDF and Utilities",
	]) {
		await expect(
			header.getByRole("button", { name: label, exact: true }),
		).toBeVisible();
	}
	await expect(header.getByRole("button", { name: "Open menu" })).toBeHidden();
});

test("mobile hides category links and shows the hamburger", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "mobile layout only");
	const header = page.locator("header");
	await expect(header.getByRole("link", { name: "Image" })).toBeHidden();
	await expect(header.getByRole("button", { name: "Open menu" })).toBeVisible();
});

test("hamburger opens a slide-over menu that closes", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "mobile layout only");
	const trigger = page.getByRole("button", { name: "Open menu" });
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
	await trigger.click();
	// the open dialog marks the background inert, so reach the morphed
	// trigger by css while the menu owns the accessible tree.
	const hiddenTrigger = page.locator('header button[aria-label="Open menu"]');
	await expect(hiddenTrigger).toHaveAttribute("aria-expanded", "true");
	const dialog = page.getByRole("dialog", { name: "Menu" });
	await expect(dialog).toBeVisible();
	await expect(
		dialog.locator("summary").filter({ hasText: "Finance" }).first(),
	).toBeVisible();
	await expect(dialog.getByRole("button", { name: "Language" })).toBeVisible();
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
	await page.getByRole("button", { name: "Close menu" }).click();
	await expect(dialog).toBeHidden({ timeout: 3000 });
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("menu links reach every category anchor", async ({ page, isMobile }) => {
	test.skip(!isMobile, "mobile layout only");
	await page.getByRole("button", { name: "Open menu" }).click();
	const dialog = page.getByRole("dialog", { name: "Menu" });
	const groups: Array<[string, string]> = [
		["Image", "#gambar"],
		["Text", "#text"],
		["Video", "#video"],
		["Audio", "#audio"],
		["Other", "#lainnya"],
		["Finance", "#finance"],
		["PDF and Utilities", "#pdf-utilities"],
	];
	for (const [label, href] of groups) {
		const details = dialog.locator("details").filter({ hasText: label }).first();
		await details.locator("summary").click();
		await expect(dialog.locator(`a[href='/${href}']`)).toBeVisible();
		await details.locator("summary").click();
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
	const trigger = page
		.locator("header")
		.getByRole("button", { name: "Language" });
	await expect(trigger).toHaveAttribute("aria-expanded", "true");
	await expect(trigger.locator("svg").last()).toHaveClass(/rotate-180/);
	await page.keyboard.press("Escape");
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
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

test("footer links legal pages and languages over a wordmark", async ({
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
	await expect(footer.getByRole("img", { name: "Toolify" })).toBeVisible();
	await expect(footer.getByRole("img", { name: "Toolify" })).toHaveAttribute(
		"src",
		/wordmark-700\.png/,
	);
	const sunk = await page.evaluate(() => {
		const bar = document.querySelector("footer.border-t");
		const mark = document.querySelector("footer.border-t img");
		if (!(bar instanceof HTMLElement) || !(mark instanceof HTMLElement)) {
			return false;
		}
		return (
			mark.getBoundingClientRect().bottom >=
			bar.getBoundingClientRect().bottom - 2
		);
	});
	expect(sunk).toBe(true);
	await expect(footer).not.toContainText("Files never leave your browser.");
});

test("page fits the viewport width", async ({ page }) => {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
});
