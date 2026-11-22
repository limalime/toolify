import { expect, test } from "@playwright/test";

const REFERENCE = [...Array(11).fill("abandon"), "about"].join(" ");

test.beforeEach(async ({ page }) => {
	await page.goto("/mnemonic-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Mnemonic Generator",
	);
});

test("warns loudly and keeps analytics off", async ({ page }) => {
	await expect(
		page.getByText("Never use a generated mnemonic for a real wallet."),
	).toBeVisible();
	await expect(page.getByTestId("tool-shell")).toHaveAttribute(
		"data-analytics",
		"off",
	);
	await page.goto("/uuid-generator");
	await expect(page.getByTestId("tool-shell")).toHaveAttribute(
		"data-analytics",
		"on",
	);
});

test("fires zero analytics requests on the mnemonic page", async ({ page }) => {
	const hits: string[] = [];
	page.on("request", (request) => {
		if (/google-analytics|googletagmanager|clarity\.ms/.test(request.url())) {
			hits.push(request.url());
		}
	});
	await page.goto("/mnemonic-generator");
	await page.getByRole("button", { name: "New mnemonic" }).click();
	await expect(page.getByLabel("Mnemonic")).not.toBeEmpty();
	expect(hits).toEqual([]);
});

test("derives the reference vector exactly", async ({ page }) => {
	await page.getByLabel("Mnemonic").fill(REFERENCE);
	await page.getByRole("combobox", { name: "Purpose" }).click();
	await page.getByRole("option", { name: "44", exact: true }).click();
	await page.getByRole("button", { name: "Derive", exact: true }).click();
	await expect(page.getByTestId("derived-address")).toContainText(
		"1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA",
	);
	await expect(page.getByText("m/44'/0'/0'/0/0")).toBeVisible();
});

test("generates 24 words and derives eth", async ({ page }) => {
	await page.getByRole("tab", { name: "24 words" }).click();
	await page.getByRole("button", { name: "New mnemonic" }).click();
	const words = (await page.getByLabel("Mnemonic").inputValue()).split(" ");
	expect(words).toHaveLength(24);
	await page.getByRole("combobox", { name: "Coin" }).click();
	await page.getByRole("option", { name: "ETH" }).click();
	await page.getByRole("button", { name: "Derive", exact: true }).click();
	await expect(page.getByTestId("derived-address")).toContainText(
		/^0x[0-9a-fA-F]{40}$/,
	);
});

test("rejects a bad mnemonic", async ({ page }) => {
	await page.getByLabel("Mnemonic").fill("hello world");
	await page.getByRole("button", { name: "Derive", exact: true }).click();
	await expect(
		page.getByText("Enter a valid 12 or 24 word mnemonic."),
	).toBeVisible();
});
