import { expect, test } from "@playwright/test";
import { FIXTURES } from "./helpers";

test("average color reports hex, rgb, hsl and a palette", async ({ page }) => {
	await page.goto("/average-color");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Average Color Finder",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	const result = page.getByTestId("average-result");
	await expect(result).toBeVisible();
	await expect(result).toContainText(/HEX\s*#[0-9a-f]{6}/);
	await expect(result).toContainText(/rgb\(/);
	await expect(result).toContainText(/hsl\(/);
	await expect(page.getByRole("button", { name: /^#[0-9a-f]{6}$/ }).first()).toBeVisible();
});

test("image color picker samples a pixel from the canvas", async ({ page }) => {
	await page.goto("/image-color-picker");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Image Color Picker",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	const canvas = page.getByTestId("picker-canvas");
	await expect(canvas).toBeVisible();
	await expect
		.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width))
		.toBeGreaterThan(300);
	await canvas.scrollIntoViewIfNeeded();
	const box = await canvas.boundingBox();
	expect(box).not.toBeNull();
	if (!box) {
		return;
	}
	const initial = await page.getByTestId("picker-current").textContent();
	await canvas.click({ position: { x: box.width * 0.2, y: box.height * 0.2 } });
	const sampled = page.getByTestId("picker-current");
	await expect(sampled).toHaveText(/^#[0-9a-f]{6}$/);
	await expect(sampled).not.toHaveText(initial ?? "");
	await expect(
		page.getByRole("button", { name: "Copy HEX" }),
	).toBeEnabled();
});

test("image metadata lists file details, exif and container chunks", async ({
	page,
}) => {
	await page.goto("/image-metadata");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Image Metadata Viewer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.photo]);
	const basic = page.getByTestId("metadata-basic");
	await expect(basic).toContainText("photo.png");
	await expect(basic).toContainText("800 x 600");
	const structure = page.getByTestId("metadata-structure");
	await expect(structure).toContainText("IHDR");
	await expect(structure).toContainText("IEND");
});

test("image metadata handles a jpeg and exposes marker structure", async ({
	page,
}) => {
	await page.goto("/image-metadata");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pet]);
	await expect(page.getByTestId("metadata-basic")).toContainText("pet.jpg");
	const structure = page.getByTestId("metadata-structure");
	await expect(structure).toContainText("SOI");
	await expect(structure).toContainText("EOI");
});