import { expect, test } from "@playwright/test";
import { downloadBytes } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/ascii-art");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online ASCII Art Generator",
	);
	await page.getByLabel("Text", { exact: true }).fill("Hi");
	await expect(page.getByTestId("ascii-preview")).not.toBeEmpty();
});

test("renders a banner and downloads txt", async ({ page }) => {
	const before = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	expect(before).toContain("\n");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download" }),
	);
	expect(filename).toBe("ascii-art.txt");
	expect(new TextDecoder().decode(bytes)).toBe(before);
});

test("switching fonts changes the banner", async ({ page }) => {
	const before = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	await page.getByRole("combobox", { name: "Font" }).click();
	await page.getByRole("option", { name: "Slant" }).click();
	const after = (await page.getByTestId("ascii-preview").textContent()) ?? "";
	expect(after).not.toBe(before);
	expect(after.length).toBeGreaterThan(0);
});
