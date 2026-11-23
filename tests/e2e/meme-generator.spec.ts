import { expect, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/meme-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Meme Generator",
	);
	await expect(page.getByTestId("meme-preview")).toBeVisible();
});

test("picks a template, adds a text layer, and downloads the meme", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Template 1", exact: true }).click();
	await page.getByRole("button", { name: "Add text" }).click();
	await page.getByLabel("Text", { exact: true }).fill("TOP JOKE");
	await expect(page.getByTestId("meme-preview")).toContainText("TOP JOKE");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download meme" }),
	);
	expect(filename).toBe("spongebob-four-panels-meme.png");
	expect(signatureOf(bytes)).toBe("png");
});

test("uses an uploaded background and keeps its file name", async ({
	page,
}) => {
	await page
		.locator("input[type='file']")
		.first()
		.setInputFiles([FIXTURES.photo]);
	await page.getByRole("button", { name: "Add text" }).click();
	await page.getByLabel("Text", { exact: true }).fill("JUST WORKS");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download meme" }),
	);
	expect(filename).toBe("photo-meme.png");
	expect(await imageDims(page, bytes)).toEqual({ width: 800, height: 600 });
});

test("adds an image layer on top of the template", async ({ page }) => {
	await page.getByRole("button", { name: "Template 1", exact: true }).click();
	await page
		.locator("input[type='file']")
		.nth(1)
		.setInputFiles([FIXTURES.logo]);
	await expect(
		page.getByTestId("meme-preview").getByRole("img", { name: "logo.png" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Remove layer" }),
	).toBeVisible();
});

test("outline controls change size and color", async ({ page }) => {
	await page.getByRole("button", { name: "Add text" }).click();
	const layer = page
		.getByTestId("meme-preview")
		.locator("[role='button']")
		.first();
	const slider = page.getByRole("slider", { name: "Outline size" });
	await expect(slider).toHaveValue("4");
	await slider.fill("10");
	await expect
		.poll(() =>
			layer.evaluate((node) => getComputedStyle(node).webkitTextStrokeWidth),
		)
		.not.toBe("0px");

	await page.locator("[data-slot='color-picker-trigger']").nth(1).click();
	const hex = page.getByRole("textbox", { name: "Hex", exact: true });
	await hex.fill("ff0000");
	await hex.press("Enter");
	await expect
		.poll(() =>
			layer.evaluate((node) => getComputedStyle(node).webkitTextStrokeColor),
		)
		.toBe("rgb(255, 0, 0)");
});

test("dragging moves a layer and the corner handle resizes it", async ({
	page,
}) => {
	await page.getByRole("button", { name: "Add text" }).click();
	await page.getByTestId("meme-preview").scrollIntoViewIfNeeded();
	const layer = page
		.getByTestId("meme-preview")
		.locator("[role='button']")
		.first();
	const before = await layer.boundingBox();
	if (!before) {
		throw new Error("layer has no box");
	}
	const sizeBefore = await layer.evaluate(
		(node) => getComputedStyle(node).fontSize,
	);
	await page.mouse.move(
		before.x + before.width / 2,
		before.y + before.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(before.x + before.width / 2 - 60, before.y + 30, {
		steps: 6,
	});
	await page.mouse.up();
	const moved = await layer.boundingBox();
	expect(moved?.x).toBeLessThan(before.x);
	expect(await layer.evaluate((node) => getComputedStyle(node).fontSize)).toBe(
		sizeBefore,
	);

	const handle = page.getByRole("button", { name: "Resize layer" });
	const grip = await handle.boundingBox();
	if (!grip) {
		throw new Error("handle has no box");
	}
	await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
	await page.mouse.down();
	await page.mouse.move(grip.x + 80, grip.y + 60, { steps: 6 });
	await page.mouse.up();
	expect(
		await layer.evaluate((node) => getComputedStyle(node).fontSize),
	).not.toBe(sizeBefore);
});
