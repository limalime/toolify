import { expect, test } from "@playwright/test";

test("landing carries full metadata in english", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveTitle(
		"Toolify: Free Online Tools for Images, Text, Video and More",
	);
	const description = page.locator("meta[name='description']");
	await expect(description).toHaveAttribute("content", /convert images/i);
	await expect(page.locator("link[rel='canonical']")).toHaveAttribute(
		"href",
		"https://toolify.bond",
	);
	await expect(page.locator("meta[property='og:title']")).toHaveAttribute(
		"content",
		/Toolify/,
	);
	await expect(page.locator("meta[property='og:type']")).toHaveAttribute(
		"content",
		"website",
	);
	await expect(page.locator("meta[property='og:locale']")).toHaveAttribute(
		"content",
		"en",
	);
	await expect(page.locator("meta[name='twitter:card']")).toHaveAttribute(
		"content",
		"summary_large_image",
	);
	await expect(page.locator("meta[name='theme-color']")).toHaveAttribute(
		"content",
		"#0A0E14",
	);
	await expect(page.locator("link[rel='icon']")).toHaveAttribute(
		"href",
		/favicon\.ico/,
	);
	await expect(page.locator("link[rel='apple-touch-icon']")).toHaveAttribute(
		"href",
		/apple-touch-icon\.png/,
	);
});

test("every locale links the others with hreflang plus x-default", async ({
	page,
}) => {
	await page.goto("/id");
	const hreflangs = await page
		.locator("link[rel='alternate']")
		.evaluateAll((nodes) =>
			nodes.map((node) => [
				node.getAttribute("hreflang"),
				node.getAttribute("href"),
			]),
		);
	const expected: Array<[string, string]> = [
		["en", "https://toolify.bond"],
		["id", "https://toolify.bond/id"],
		["es", "https://toolify.bond/es"],
		["ja", "https://toolify.bond/ja"],
		["zh", "https://toolify.bond/zh"],
		["fr", "https://toolify.bond/fr"],
		["ar", "https://toolify.bond/ar"],
		["x-default", "https://toolify.bond"],
	];
	expect(hreflangs).toEqual(expected);
	await expect(page.locator("link[rel='canonical']")).toHaveAttribute(
		"href",
		"https://toolify.bond/id",
	);
});

test("titles and descriptions differ per locale", async ({ page }) => {
	await page.goto("/");
	const englishTitle = await page.title();
	await page.goto("/ja");
	const japaneseTitle = await page.title();
	expect(englishTitle).not.toBe(japaneseTitle);
	await expect(page.locator("meta[name='description']")).toHaveAttribute(
		"content",
		/ブラウザ/,
	);
});

test("landing embeds website and organization json-ld", async ({ page }) => {
	await page.goto("/");
	const blocks = page.locator("script[type='application/ld+json']");
	await expect(blocks).toHaveCount(2);
	const types = [];
	for (let index = 0; index < 2; index++) {
		const text = await blocks.nth(index).textContent();
		types.push((JSON.parse(text ?? "") as { "@type": string })["@type"]);
	}
	expect(types.sort()).toEqual(["Organization", "WebSite"]);
});

test("robots allows all and points at the sitemap", async ({ request }) => {
	const response = await request.get("/robots.txt");
	expect(response.ok()).toBe(true);
	const body = await response.text();
	expect(body).toContain("User-Agent: *");
	expect(body).toContain("Allow: /");
	expect(body).toContain("Sitemap: https://toolify.bond/sitemap.xml");
});

test("sitemap index lists seven locale sitemaps", async ({ request }) => {
	const response = await request.get("/sitemap.xml");
	expect(response.ok()).toBe(true);
	const body = await response.text();
	for (const code of ["en", "id", "es", "ja", "zh", "fr", "ar"]) {
		expect(body).toContain(`/sitemap/${code}.xml`);
	}
});

test("per-locale sitemap lists every page with alternates", async ({
	request,
}) => {
	const response = await request.get("/sitemap/id.xml");
	expect(response.ok()).toBe(true);
	const body = await response.text();
	expect(body).toContain("<loc>https://toolify.bond/id</loc>");
	expect(body).toContain("<loc>https://toolify.bond/id/image-converter</loc>");
	expect(body).toContain('hreflang="en"');
	expect(body).toContain('hreflang="x-default"');
	expect(body).not.toContain("/internal/");
});

test("custom 404 renders in english with search and home", async ({ page }) => {
	const response = await page.goto("/nope-missing-page");
	expect(response?.status()).toBe(404);
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Page not found",
	);
	await expect(page.getByRole("searchbox")).toBeVisible();
	await page.getByRole("link", { name: "Back to homepage" }).click();
	await expect(page).toHaveURL(/localhost:3100\/?$/);
});

test("custom 404 renders translated in indonesian", async ({ page }) => {
	const response = await page.goto("/id/nope-missing-page");
	expect(response?.status()).toBe(404);
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Halaman tidak ditemukan",
	);
	await expect(page.getByRole("searchbox")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Kembali ke beranda" }),
	).toBeVisible();
});
