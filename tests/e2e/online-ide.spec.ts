import { expect, test } from "@playwright/test";
import { downloadBytes } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/online-ide");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Code Editor",
	);
	await page.locator(".cm-content").click();
});

test("writes and downloads with the right extension", async ({ page }) => {
	await page.keyboard.type("const x = 1;");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download", exact: true }),
	);
	expect(filename).toBe("snippet.js");
	expect(new TextDecoder().decode(bytes)).toBe("const x = 1;");
});

test("switching language changes the download", async ({ page }) => {
	await page.getByRole("combobox", { name: "Language" }).click();
	await page.getByRole("option", { name: "Rust" }).click();
	await page.locator(".cm-content").click();
	await page.keyboard.type("fn main() {}");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download", exact: true }),
	);
	expect(filename).toBe("snippet.rs");
	expect(new TextDecoder().decode(bytes)).toBe("fn main() {}");
});
