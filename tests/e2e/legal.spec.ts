import { expect, test } from "@playwright/test";

const PAGES: Array<{ path: string; h1: Record<string, string> }> = [
	{
		path: "/about",
		h1: { en: "About Toolify", id: "Tentang Toolify", ar: "حول Toolify" },
	},
	{
		path: "/contact",
		h1: { en: "Contact", id: "Kontak", ar: "اتصل بنا" },
	},
	{
		path: "/privacy",
		h1: { en: "Privacy Policy", id: "Kebijakan Privasi", ar: "سياسة الخصوصية" },
	},
	{
		path: "/terms",
		h1: { en: "Terms of Service", id: "Ketentuan Layanan", ar: "شروط الخدمة" },
	},
];

for (const page of PAGES) {
	for (const [locale, h1] of Object.entries(page.h1)) {
		const url = locale === "en" ? page.path : `/${locale}${page.path}`;
		test(`${url} renders its heading`, async ({ page: browser }) => {
			const response = await browser.goto(url);
			expect(response?.ok()).toBe(true);
			await expect(browser.getByRole("heading", { level: 1 })).toContainText(
				h1,
			);
			await expect(browser.locator("html")).toHaveAttribute(
				"lang",
				locale === "en" ? "en" : locale,
			);
		});
	}
}

test("legal pages carry unique titles with the site suffix", async ({
	page,
}) => {
	await page.goto("/about");
	await expect(page).toHaveTitle("About | Toolify");
	await page.goto("/privacy");
	await expect(page).toHaveTitle("Privacy Policy | Toolify");
});

test("privacy names analytics, consent, and local files", async ({ page }) => {
	await page.goto("/privacy");
	await expect(page.locator("main")).toContainText("Google Analytics 4");
	await expect(page.locator("main")).toContainText("Microsoft Clarity");
	await expect(page.locator("main")).toContainText("Consent Mode v2");
	await expect(page.locator("main")).toContainText("never leave your browser");
});

test("contact validates before sending", async ({ page }) => {
	await page.goto("/contact");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.getByText("Fill in every field.")).toBeVisible();
	await page.getByLabel("Name").fill("Ada");
	await page.getByLabel("Email").fill("not-an-email");
	await page.getByLabel("Message").fill("Hello");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(
		page.getByText("Enter an address like name@example.com."),
	).toBeVisible();
});

test("contact send button uses the candy default", async ({ page }) => {
	await page.goto("/contact");
	const send = page.getByRole("button", { name: "Send message" });
	const background = await send.evaluate(
		(node) => getComputedStyle(node).backgroundImage,
	);
	expect(background).toContain("linear-gradient");
});

test("contact posts to web3forms and confirms delivery", async ({ page }) => {
	await page.route("https://api.web3forms.com/submit", async (route) => {
		const body = route.request().postDataJSON() as {
			access_key?: string;
			name?: string;
			email?: string;
			message?: string;
		};
		expect(body.access_key).toBe("c75a459b-7323-4a49-85da-6c40a49e1120");
		expect(body.message).toBe("Hello");
		await route.fulfill({
			body: JSON.stringify({ success: true }),
			contentType: "application/json",
			status: 200,
		});
	});
	await page.goto("/contact");
	await page.getByLabel("Name").fill("Ada");
	await page.getByLabel("Email").fill("ada@example.com");
	await page.getByLabel("Message").fill("Hello");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(page.getByText("Message sent")).toBeVisible();
});

test("contact reports a failed delivery", async ({ page }) => {
	await page.route("https://api.web3forms.com/submit", async (route) => {
		await route.fulfill({
			body: JSON.stringify({ success: false }),
			contentType: "application/json",
			status: 200,
		});
	});
	await page.goto("/contact");
	await page.getByLabel("Name").fill("Ada");
	await page.getByLabel("Email").fill("ada@example.com");
	await page.getByLabel("Message").fill("Hello");
	await page.getByRole("button", { name: "Send message" }).click();
	await expect(
		page.getByText("The message could not be delivered. Try again later."),
	).toBeVisible();
});

test("site files serve with content", async ({ request }) => {
	const llms = await request.get("/llms.txt");
	expect(llms.ok()).toBe(true);
	expect(await llms.text()).toContain("# Toolify");

	const security = await request.get("/.well-known/security.txt");
	expect(security.ok()).toBe(true);
	expect(await security.text()).toContain("Contact:");

	const manifest = await request.get("/site.webmanifest");
	expect(manifest.ok()).toBe(true);
	expect(await manifest.json()).toMatchObject({ name: "Toolify" });

	expect((await request.get("/favicon.ico")).ok()).toBe(true);
	expect((await request.get("/apple-touch-icon.png")).ok()).toBe(true);
});
