import { expect, test } from "@playwright/test";

const LOCALES: Array<{ code: string; path: string; privacyLine: string }> = [
	{ code: "en", path: "/", privacyLine: "Files never leave your browser." },
	{
		code: "id",
		path: "/id",
		privacyLine: "File tidak pernah meninggalkan browser Anda.",
	},
	{
		code: "es",
		path: "/es",
		privacyLine: "Tus archivos nunca salen de tu navegador.",
	},
	{
		code: "ja",
		path: "/ja",
		privacyLine: "ファイルがブラウザの外に出ることはありません。",
	},
	{ code: "zh", path: "/zh", privacyLine: "文件永远不会离开您的浏览器。" },
	{
		code: "fr",
		path: "/fr",
		privacyLine: "Vos fichiers ne quittent jamais votre navigateur.",
	},
	{ code: "ar", path: "/ar", privacyLine: "لا تغادر ملفاتك متصفحك أبدا." },
];

for (const locale of LOCALES) {
	test(`/${locale.code} renders with translated shell`, async ({ page }) => {
		const response = await page.goto(locale.path);
		expect(response?.ok()).toBe(true);
		await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
		await expect(page.locator("header")).toBeVisible();
		await expect(page.locator("footer.border-t")).toContainText(
			locale.privacyLine,
		);
		const overflow = await page.evaluate(
			() =>
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth,
		);
		expect(overflow).toBeLessThanOrEqual(1);
	});
}

test("arabic renders right to left, english left to right", async ({
	page,
}) => {
	await page.goto("/ar");
	await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
	await page.goto("/");
	await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("switcher navigates between locales live", async ({ page }) => {
	await page.goto("/");
	await page
		.locator("header")
		.getByRole("button", { name: "Language" })
		.click();
	await page.locator("[role='menu']").locator("a[href='/id']").click();
	await expect(page).toHaveURL(/\/id\/?$/);
	await expect(page.locator("html")).toHaveAttribute("lang", "id");

	await page.locator("header").getByRole("button", { name: "Bahasa" }).click();
	await page.locator("[role='menu']").locator("a[href='/']").click();
	await expect(page).toHaveURL(/localhost:3100\/?$/);
	await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("bare path serves the browser language", async ({ browser }) => {
	const indonesian = await browser.newContext({ locale: "id-ID" });
	const page = await indonesian.newPage();
	await page.goto("/");
	await expect(page).toHaveURL(/\/id\/?$/);
	await expect(page.locator("html")).toHaveAttribute("lang", "id");
	await indonesian.close();
});

test("bare path stays english for english browsers", async ({ browser }) => {
	const english = await browser.newContext({ locale: "en-US" });
	const page = await english.newPage();
	const response = await page.goto("/");
	expect(response?.ok()).toBe(true);
	await expect(page).toHaveURL(/localhost:3100\/?$/);
	await english.close();
});

test("unknown locale answers not found", async ({ page }) => {
	const response = await page.goto("/xx");
	expect(response?.status()).toBe(404);
});
