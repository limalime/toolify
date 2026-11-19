import { expect, test } from "@playwright/test";

const LOCALES: Array<{
	code: string;
	path: string;
	privacyLine: string;
	heroTitle: string;
}> = [
	{
		code: "en",
		path: "/",
		privacyLine: "Files never leave your browser.",
		heroTitle: "Every tool you need. Free, fast, private.",
	},
	{
		code: "id",
		path: "/id",
		privacyLine: "File tidak pernah meninggalkan browser Anda.",
		heroTitle: "Semua alat yang Anda butuhkan. Gratis, cepat, privat.",
	},
	{
		code: "es",
		path: "/es",
		privacyLine: "Tus archivos nunca salen de tu navegador.",
		heroTitle: "Cada herramienta que necesitas. Gratis, rápida, privada.",
	},
	{
		code: "ja",
		path: "/ja",
		privacyLine: "ファイルがブラウザの外に出ることはありません。",
		heroTitle: "必要なツールが全部ある。無料、高速、プライベート。",
	},
	{
		code: "zh",
		path: "/zh",
		privacyLine: "文件永远不会离开您的浏览器。",
		heroTitle: "你需要的工具全都有，免费、快速、私密。",
	},
	{
		code: "fr",
		path: "/fr",
		privacyLine: "Tes fichiers ne quittent jamais ton navigateur.",
		heroTitle: "Chaque outil qu'il te faut. Gratuit, rapide, privé.",
	},
	{
		code: "ar",
		path: "/ar",
		privacyLine: "لا تغادر ملفاتك متصفحك أبدا.",
		heroTitle: "كل أداة تحتاجها. مجاني وسريع وخاص.",
	},
];

for (const locale of LOCALES) {
	test(`/${locale.code} renders with translated shell`, async ({ page }) => {
		const response = await page.goto(locale.path);
		expect(response?.ok()).toBe(true);
		await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
		await expect(page.locator("header")).toBeVisible();
		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			locale.heroTitle,
		);
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
