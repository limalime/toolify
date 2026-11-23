import { expect, test } from "@playwright/test";

test("hero shows the art, keeps the headline, and drops the old subcopy", async ({
	page,
}) => {
	await page.goto("/");
	const heroArt = page.locator('img[src*="hero-workbench"]:visible').first();
	await expect(heroArt).toBeVisible();
	const heading = page.getByRole("heading", { level: 1 });
	await expect(heading).toContainText(
		"Every tool you need. Free, fast, private.",
	);
	await expect(heading.locator("span")).toHaveText("Free, fast, private.");
	await expect(
		page.getByText(
			"Free tools for images, text, video, and more. Everything runs in your browser.",
		),
	).toHaveCount(0);
});

test("featured tools render three distinct cards from local storage", async ({
	page,
}) => {
	await page.goto("/");
	const cards = page.locator("[data-featured-tool]");
	await expect(cards).toHaveCount(3);
	const slugs = await cards.evaluateAll((nodes) =>
		nodes.map((node) => node.getAttribute("data-featured-tool")),
	);
	expect(new Set(slugs).size).toBe(3);
	for (const slug of slugs) {
		expect(slug).toBeTruthy();
	}
	const stored = await page.evaluate(() =>
		window.localStorage.getItem("toolify.featured.v1"),
	);
	expect(stored).toBeTruthy();
	const parsed = JSON.parse(stored ?? "{}") as { picks?: string[] };
	expect(parsed.picks).toEqual(slugs);
	for (let index = 0; index < 3; index += 1) {
		const image = cards.nth(index).locator("img");
		await expect(image).toHaveAttribute(
			"src",
			/featured(%2F|\/).+\.(jpg|png)/,
		);
		const loaded = await image.evaluate(
			(node) => node instanceof HTMLImageElement && node.naturalWidth > 0,
		);
		expect(loaded).toBe(true);
	}
	await page.reload();
	await expect(page.locator("[data-featured-tool]")).toHaveCount(3);
	const after = await page
		.locator("[data-featured-tool]")
		.evaluateAll((nodes) =>
			nodes.map((node) => node.getAttribute("data-featured-tool")),
		);
	expect(after).toEqual(slugs);
});

test("404 page carries the cat, the copy, search and a home button", async ({
	page,
}) => {
	const response = await page.goto("/no-such-page");
	expect(response?.status()).toBe(404);
	await expect(
		page.getByRole("heading", { level: 1, name: "Oops, Page not found" }),
	).toBeVisible();
	await expect(
		page.getByText(
			"That address does not exist. Search the tools or head back home.",
		),
	).toBeVisible();
	await expect(
		page.locator('img[src*="notfound-cat-404"]:visible').first(),
	).toBeVisible();
	await expect(page.getByRole("searchbox", { name: /search tools/i })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Back to homepage" }),
	).toHaveAttribute("href", "/");
});

test("desktop category menus open a tool panel and close on escape", async ({
	page,
	isMobile,
}) => {
	test.skip(!!isMobile, "desktop layout only");
	await page.goto("/");
	const trigger = page
		.locator("header")
		.getByRole("button", { name: "Image", exact: true });
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
	await trigger.click();
	await expect(trigger).toHaveAttribute("aria-expanded", "true");
	const panel = page.locator("#category-gambar");
	await expect(panel).toBeVisible();
	await expect(
		panel.getByRole("link", { name: "Image Converter" }),
	).toBeVisible();
	await expect(
		panel.getByRole("link", { name: "Average Color Finder" }),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("tip link sits in the header and reaches the support page", async ({
	page,
}) => {
	await page.goto("/");
	const tip = page
		.locator("header")
		.getByRole("link", { name: "Support Toolify" });
	await expect(tip).toBeVisible();
	await tip.click();
	await expect(page).toHaveURL(/\/support\/?$/);
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Keep Toolify free",
	);
});

test("every tool page carries share and report buttons", async ({ page }) => {
	await page.goto("/word-counter");
	const bar = page.getByTestId("share-bar");
	await expect(bar).toBeVisible();
	await bar.getByRole("button", { name: "Share" }).click();
	for (const name of ["WhatsApp", "X", "Facebook", "LinkedIn"]) {
		await expect(bar.getByRole("link", { name })).toBeVisible();
	}
	await expect(
		bar.getByRole("link", { name: "Report Bug" }),
	).toHaveAttribute("href", "/contact?tool=word-counter");
});

test("support offers kofi, paypal and guarded crypto addresses", async ({
	page,
}) => {
	await page.goto("/support");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Keep Toolify free",
	);
	const combo = page.getByRole("combobox", { name: "Choose a way to support" });
	await expect(page.getByTitle("Buy a coffee")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Open Ko-fi" }),
	).toHaveAttribute("href", "https://ko-fi.com/usetoolify");

	await combo.click();
	await page.getByRole("option", { name: "PayPal" }).click();
	await expect(
		page.getByRole("link", { name: "Open PayPal" }),
	).toHaveAttribute("href", "https://paypal.me/usetoolify");

	await combo.click();
	await page.getByRole("option", { name: "Bitcoin" }).click();
	await expect(
		page.getByText("This address has not been added yet.").first(),
	).toBeVisible();
	await expect(page.locator("code")).toContainText("[MING] BTC address");
});

test("privacy line uses the new wording on tool pages", async ({ page }) => {
	await page.goto("/image-converter");
	await expect(
		page.getByText("100% Private, files never leave your browser.").first(),
	).toBeVisible();
});