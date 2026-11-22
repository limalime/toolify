import { expect, type Page, test } from "@playwright/test";

const DATE = "2026-11-20";

const BASE_RATES: Record<string, Record<string, number>> = {
	USD: { EUR: 0.91, IDR: 18263, JPY: 159.35 },
	EUR: { USD: 1.1, IDR: 20000, JPY: 175 },
};

function rows(base: string, rates: Record<string, number>) {
	return Object.entries(rates).map(([quote, rate]) => ({
		base,
		date: DATE,
		quote,
		rate,
	}));
}

async function mockRates(page: Page) {
	await page.route("https://api.frankfurter.dev/**", (route) => {
		const url = new URL(route.request().url());
		const base = url.searchParams.get("base") ?? "USD";
		const table = BASE_RATES[base] ?? {};
		return route.fulfill({ json: rows(base, table) });
	});
}

test("converts the default amount with a dated rate", async ({ page }) => {
	await mockRates(page);
	await page.goto("/currency-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Currency Converter",
	);
	await expect(page.getByTestId("fx-result")).toHaveText("€91.00");
	await expect(page.getByTestId("fx-rate-date")).toContainText("Nov 20, 2026");
	await expect(page.getByText("1 USD = 0.91 EUR")).toBeVisible();
});

test("swaps the two currencies and fetches the new base", async ({ page }) => {
	await mockRates(page);
	await page.goto("/currency-converter");
	await expect(page.getByTestId("fx-result")).toHaveText("€91.00");
	await page.getByTestId("fx-swap").click();
	await expect(page.getByTestId("fx-result")).toHaveText("$110.00");
});

test("falls back to a saved rate and labels it", async ({ page }) => {
	await page.addInitScript(() => {
		const stale = {
			base: "USD",
			date: "2026-01-02",
			rates: { EUR: 0.8 },
			fetchedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
		};
		localStorage.setItem("toolify:fx:USD", JSON.stringify(stale));
	});
	await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
	await page.goto("/currency-converter");
	await expect(page.getByTestId("fx-stale")).toBeVisible();
	await expect(page.getByTestId("fx-result")).toHaveText("€80.00");
	await expect(page.getByTestId("fx-stale")).toContainText("Jan 2, 2026");
});

test("explains an unreachable service when nothing is saved", async ({
	page,
}) => {
	await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
	await page.goto("/currency-converter");
	await expect(page.getByTestId("fx-error")).toBeVisible();
	await expect(page.getByTestId("fx-result")).toHaveText("");
});
