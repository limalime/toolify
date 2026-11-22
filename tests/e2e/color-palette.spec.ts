import { expect, test } from "@playwright/test";
import { downloadBytes } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/color-palette");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Color Palette Generator",
	);
});

test("shows five analogous colors around the base", async ({ page }) => {
	await expect(page.getByTestId("palette-swatch-0")).toBeVisible();
	await expect(page.getByTestId("palette-swatch-4")).toBeVisible();
	await expect(page.getByTestId("palette-swatch-2")).toContainText("#1b56fd");
});

test("switches harmony modes", async ({ page }) => {
	await page.getByRole("tab", { name: "Complementary" }).click();
	await expect(page.getByTestId("palette-swatch-1")).toBeVisible();
	await expect(page.getByTestId("palette-swatch-2")).toHaveCount(0);

	await page.getByRole("tab", { name: "Triadic" }).click();
	await expect(page.getByTestId("palette-swatch-2")).toBeVisible();
	await expect(page.getByTestId("palette-swatch-3")).toHaveCount(0);
});

test("accepts a new base color and rejects a bad hex", async ({ page }) => {
	await page.getByTestId("palette-hex").fill("#ff0000");
	await expect(page.getByTestId("palette-swatch-2")).toContainText("#ff0000");

	await page.getByTestId("palette-hex").fill("nope");
	await expect(page.getByTestId("palette-hex-error")).toContainText(
		"Enter a hex color like #1b56fd",
	);
});

test("copies every hex and exports css", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.getByTestId("palette-copy-all").click();
	await expect(page.getByTestId("palette-copy-all")).toContainText("Copied");

	const clipboard = await page.evaluate(() => navigator.clipboard.readText());
	expect(clipboard.split(", ")).toHaveLength(5);
	expect(clipboard).toContain("#1b56fd");

	const css = await downloadBytes(
		page,
		page.getByRole("button", { name: "Export CSS" }),
	);
	expect(css.filename).toBe("palette-1b56fd.css");
	expect(new TextDecoder().decode(css.bytes)).toContain(
		"--palette-3: #1b56fd;",
	);
});
