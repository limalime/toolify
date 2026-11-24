import { expect, type Page, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

async function stubAnalytics(page: Page, country: string) {
	const hits: string[] = [];
	await page.route("**/api/geo", (route) =>
		route.fulfill({ json: { country } }),
	);
	await page.route(
		/clarity\.ms|google-analytics\.com|googletagmanager\.com/,
		(route) => {
			hits.push(route.request().url());
			return route.fulfill({
				body: "/* analytics stub */",
				contentType: "application/javascript",
			});
		},
	);
	return hits;
}

async function eventNames(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const layer = (window as { dataLayer?: unknown[] }).dataLayer ?? [];
		return layer
			.map((entry) => entry as unknown[])
			.filter((entry) => entry[0] === "event")
			.map((entry) => String(entry[1]));
	});
}

test("eea banner blocks every analytics request until accepted", async ({
	page,
}) => {
	const hits = await stubAnalytics(page, "DE");
	await page.goto("/");
	const banner = page.getByTestId("consent-banner");
	await expect(banner).toBeVisible();
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
	await page.waitForTimeout(400);
	expect(hits).toEqual([]);
	expect(await page.locator("script[src*='googletagmanager']").count()).toBe(0);
	expect(await page.locator("script[src*='clarity.ms']").count()).toBe(0);

	await page.getByRole("button", { name: "Accept analytics" }).click();
	await expect(banner).toBeHidden();
	await expect
		.poll(() => page.locator("script[src*='googletagmanager']").count())
		.toBe(1);
	await expect
		.poll(() => page.locator("script[src*='clarity.ms']").count())
		.toBe(1);
	// the tag now owns the landing view, so a config for the measurement id
	// is what proves analytics started. the page view itself comes from
	// gtag.js and a stubbed tag never sends one.
	const configIds = await page.evaluate(() => {
		const layer = (window as { dataLayer?: unknown[] }).dataLayer ?? [];
		return layer
			.map((entry) => entry as unknown[])
			.filter((entry) => entry[0] === "config")
			.map((entry) => String(entry[1]));
	});
	expect(configIds.some((id) => id.startsWith("G-"))).toBe(true);

	await page.evaluate(() => {
		document
			.querySelector('a[href="/unit-converter"]')
			?.dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
			);
	});
	await expect.poll(() => eventNames(page)).toContain("page_view");

	await page.reload();
	await expect(page.getByTestId("consent-banner")).toBeHidden();
	await expect
		.poll(() => page.locator("script[src*='googletagmanager']").count())
		.toBe(1);
});

test("declining keeps tags away and privacy can reopen the choice", async ({
	page,
}) => {
	const hits = await stubAnalytics(page, "FR");
	await page.goto("/");
	await expect(page.getByTestId("consent-banner")).toBeVisible();
	await page.getByRole("button", { name: "Decline" }).click();
	await expect(page.getByTestId("consent-banner")).toBeHidden();
	await page.waitForTimeout(300);
	expect(hits).toEqual([]);

	await page.goto("/privacy");
	await page.getByRole("button", { name: "Analytics settings" }).click();
	await expect(page.getByTestId("consent-banner")).toBeVisible();
	await page.getByRole("button", { name: "Accept analytics" }).click();
	await expect
		.poll(() => page.locator("script[src*='googletagmanager']").count())
		.toBe(1);
});

test("visitors outside the eea get analytics without a banner", async ({
	page,
}) => {
	const hits = await stubAnalytics(page, "US");
	await page.goto("/unit-converter");
	await expect(page.getByTestId("consent-banner")).toBeHidden();
	await expect
		.poll(() => page.locator("script[src*='googletagmanager']").count())
		.toBe(1);
	expect(hits.length).toBeGreaterThan(0);
	await expect.poll(() => eventNames(page)).toContain("tool_open");
	await expect.poll(() => eventNames(page)).toContain("tool_complete");

	const events = await page.evaluate(() => {
		const layer = (window as { dataLayer?: unknown[] }).dataLayer ?? [];
		return layer
			.map((entry) => entry as unknown[])
			.filter(
				(entry) =>
					entry[0] === "event" &&
					(entry[1] === "tool_open" || entry[1] === "tool_complete"),
			)
			.map((entry) => ({ name: entry[1], params: entry[2] }));
	});
	for (const event of events) {
		const keys = Object.keys((event.params ?? {}) as Record<string, unknown>);
		expect(keys.sort()).toEqual(["page_language", "tool"]);
	}
});

test("a client hop counts one page view per page", async ({ page }) => {
	await stubAnalytics(page, "US");
	await page.goto("/unit-converter");
	await expect
		.poll(() => page.locator("script[src*='googletagmanager']").count())
		.toBe(1);
	const countViews = () =>
		eventNames(page).then(
			(names) => names.filter((name) => name === "page_view").length,
		);
	// the tag owns the landing view, so the client adds none of its own.
	expect(await countViews()).toBe(0);

	await page.evaluate(() => {
		document
			.querySelector('a[href="/case-converter"]')
			?.dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
			);
	});
	await expect.poll(() => page.url()).toContain("/case-converter");
	await expect.poll(countViews).toBe(1);

	await page.evaluate(() => {
		document
			.querySelector('a[href="/image-converter"]')
			?.dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
			);
	});
	await expect.poll(() => page.url()).toContain("/image-converter");
	await expect.poll(countViews).toBe(2);
});

test("copy actions count as a completed tool", async ({ page }) => {
	await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
	const hits = await stubAnalytics(page, "US");
	await page.goto("/case-converter");
	await page.getByLabel("Text").fill("hello world");
	await page.getByTestId("case-card-upper").click();
	await expect
		.poll(async () => {
			const events = await page.evaluate(() => {
				const layer = (window as { dataLayer?: unknown[] }).dataLayer ?? [];
				return layer
					.map((entry) => entry as unknown[])
					.filter((entry) => entry[0] === "event")
					.map((entry) => entry[1]);
			});
			return events;
		})
		.toContain("tool_complete");
	await page.waitForTimeout(200);
	expect(hits.length).toBeGreaterThan(0);
});

test("the tool surface stays masked from session replay", async ({ page }) => {
	await page.goto("/image-converter");
	const masked = page.locator('[data-clarity-mask="true"]');
	await expect(masked).toHaveCount(1);
	await expect(masked.locator("input[type='file']")).toHaveCount(1);
});

test("mnemonic pages load no analytics even when consent would allow it", async ({
	page,
}) => {
	const hits = await stubAnalytics(page, "US");
	await page.goto("/mnemonic-generator");
	await expect(
		page.getByText("Never use a generated mnemonic for a real wallet."),
	).toBeVisible();
	await page.waitForTimeout(500);
	expect(hits).toEqual([]);
	expect(await eventNames(page)).toEqual([]);
	expect(await page.locator("script[src*='googletagmanager']").count()).toBe(0);
	expect(await page.locator("script[src*='clarity.ms']").count()).toBe(0);
});

test("analytics is off on localized mnemonic pages too", async ({ page }) => {
	const hits = await stubAnalytics(page, "US");
	await page.goto("/ar/mnemonic-generator");
	await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
	await page.waitForTimeout(400);
	expect(hits).toEqual([]);
	expect(await eventNames(page)).toEqual([]);
});
