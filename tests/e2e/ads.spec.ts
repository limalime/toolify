import { expect, test } from "@playwright/test";

const AD_HOSTS = [
	"googlesyndication.com",
	"doubleclick.net",
	"adservice.google.com",
	"adsbygoogle",
];

function watchAdRequests(page: import("@playwright/test").Page): string[] {
	const hits: string[] = [];
	page.on("request", (request) => {
		const url = request.url();
		if (AD_HOSTS.some((host) => url.includes(host))) {
			hits.push(url);
		}
	});
	return hits;
}

test.describe("ad slots at desktop", () => {
	test.use({ viewport: { width: 1600, height: 1000 } });

	test("homepage reserves two slots without drawing anything", async ({
		page,
	}) => {
		const hits = watchAdRequests(page);
		await page.goto("/");

		for (const name of ["home_below_tools", "home_above_footer"]) {
			const slot = page.locator(`[data-ad-slot="${name}"]`);
			await expect(slot).toHaveCount(1);
			await expect(slot).toHaveAttribute("data-ad-state", "reserved");
			await expect(slot).toBeHidden();
			expect(await slot.boundingBox()).toBeNull();
		}

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(1);
		expect(hits).toEqual([]);
		expect(
			await page
				.locator("script[src*='adsbygoogle'], script[src*='googlesyndication']")
				.count(),
		).toBe(0);
	});

	test("tool page reserves the rail, the leaderboard, and the faq gap", async ({
		page,
	}) => {
		const hits = watchAdRequests(page);
		await page.goto("/image-converter");

		for (const name of [
			"tool_below_tool",
			"tool_in_faq",
			"tool_sidebar_sticky",
		]) {
			const slot = page.locator(`[data-ad-slot="${name}"]`);
			await expect(slot).toHaveCount(1);
			await expect(slot).toHaveAttribute("data-ad-state", "reserved");
			await expect(slot).toBeHidden();
		}

		const shell = await page.getByTestId("tool-shell").boundingBox();
		const rail = await page
			.locator('[data-ad-rail="tool_sidebar_sticky"]')
			.boundingBox();
		expect(shell).not.toBeNull();
		expect(rail).not.toBeNull();
		if (shell && rail) {
			// the rail lives in the gutter, never inside the content column
			expect(rail.x).toBeGreaterThanOrEqual(shell.x + shell.width - 1);
		}

		expect(hits).toEqual([]);
	});

	test("the faq slot sits between answers, not outside the accordion", async ({
		page,
	}) => {
		await page.goto("/image-converter");
		const items = page.locator("[data-slot='accordion-item']");
		await expect(items.first()).toBeVisible();
		const slot = page.locator('[data-ad-slot="tool_in_faq"]');
		const order = await page.evaluate(() => {
			const root = document.querySelector("[data-slot='accordion']");
			if (!root) {
				return -1;
			}
			return [...root.children].findIndex(
				(child) => child.getAttribute("data-ad-slot") === "tool_in_faq",
			);
		});
		expect(order).toBe(2);
		await expect(slot).toBeHidden();
	});
});

test.describe("ad slots on mobile", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("nothing renders at 390px and the page does not scroll sideways", async ({
		page,
	}) => {
		const hits = watchAdRequests(page);
		await page.goto("/image-converter");

		for (const name of [
			"tool_below_tool",
			"tool_in_faq",
			"tool_sidebar_sticky",
		]) {
			const slot = page.locator(`[data-ad-slot="${name}"]`);
			await expect(slot).toHaveCount(1);
			await expect(slot).toBeHidden();
		}
		await expect(
			page.locator('[data-ad-rail="tool_sidebar_sticky"]'),
		).toBeHidden();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth,
		);
		expect(overflow).toBeLessThanOrEqual(1);
		expect(hits).toEqual([]);
	});
});

test("ads.txt stays absent until the publisher id exists", async ({
	request,
}) => {
	const response = await request.get("/ads.txt");
	expect(response.status()).toBe(404);
});
