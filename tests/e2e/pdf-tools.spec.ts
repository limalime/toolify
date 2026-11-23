import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
	PDFArray,
	PDFDocument,
	PDFName,
	PDFRawStream,
	type PDFRef,
} from "pdf-lib";
import { downloadBytes, FIXTURES, signatureOf } from "./helpers";

test("pdf viewer renders a pdf and zooms", async ({ page }) => {
	await page.goto("/pdf-viewer");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online PDF Viewer",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pdf]);
	const canvas = page.getByTestId("pdf-page");
	await expect(canvas).toBeVisible({ timeout: 30_000 });
	await expect(canvas).toHaveAttribute("data-rendered-page", "1");
	await expect(page.getByTestId("pdf-viewer-error")).toHaveCount(0);
	await expect(page.getByRole("spinbutton", { name: /Page/ })).toHaveValue("1");
	await expect(page.getByText("110%")).toBeVisible();
	await page.getByRole("button", { name: "Zoom in" }).click();
	await expect(page.getByText("130%")).toBeVisible();
	await expect(canvas).toHaveAttribute("data-rendered-page", "1");
	await page.getByRole("button", { name: "Close file" }).click();
	await expect(page.getByTestId("pdf-page")).toBeHidden();
});

test("pdf viewer renders an inline image page on first load", async ({
	page,
}) => {
	await page.goto("/pdf-viewer");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.inlineImage]);
	const canvas = page.getByTestId("pdf-page");
	await expect(canvas).toHaveAttribute("data-rendered-page", "1", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("pdf-viewer-error")).toHaveCount(0);
	const pageBox = await canvas.evaluate((element) => {
		const target = element as HTMLCanvasElement;
		return { width: target.width, height: target.height };
	});
	expect(pageBox.width).toBeGreaterThan(0);
	expect(pageBox.height).toBeGreaterThan(0);

	await page.getByRole("spinbutton", { name: /Page/ }).fill("2");
	await expect(canvas).toHaveAttribute("data-rendered-page", "2", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("pdf-viewer-error")).toHaveCount(0);
});

test("pdf viewer keeps the canvas and page number in step while zooming", async ({
	page,
}) => {
	await page.goto("/pdf-viewer");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.inlineImage]);
	const canvas = page.getByTestId("pdf-page");
	const pageInput = page.getByRole("spinbutton", { name: /Page/ });
	await expect(canvas).toHaveAttribute("data-rendered-page", "1", {
		timeout: 30_000,
	});

	await pageInput.fill("2");
	const immediate = await canvas.evaluate((element) => ({
		page: element.getAttribute("data-rendered-page"),
	}));
	expect(immediate.page).not.toBe("1");
	await expect(canvas).toHaveAttribute("data-rendered-page", "2", {
		timeout: 30_000,
	});

	for (const value of ["1", "2", "1", "2"]) {
		await pageInput.fill(value);
	}
	await expect(canvas).toHaveAttribute("data-rendered-page", "2", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("pdf-viewer-error")).toHaveCount(0);

	await page.getByRole("button", { name: "Zoom in" }).click();
	await page.getByRole("button", { name: "Zoom in" }).click();
	await expect(page.getByText("150%")).toBeVisible();
	await expect(canvas).toHaveAttribute("data-rendered-page", "2", {
		timeout: 30_000,
	});
	await expect(page.getByTestId("pdf-viewer-error")).toHaveCount(0);
});

test("pdf compressor shrinks images and keeps text and links", async ({
	page,
	context,
}) => {
	test.setTimeout(180_000);
	await page.goto("/pdf-compressor");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free PDF Compressor",
	);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.imageHeavy]);
	await page.getByRole("combobox", { name: "Quality" }).click();
	await page.getByRole("option", { name: /Low/ }).click();
	await page.getByRole("button", { name: "Compress PDF" }).click();
	const result = page.getByTestId("compress-result");
	await expect(result).toBeVisible({ timeout: 120_000 });
	await expect(result).toContainText("Before");
	await expect(result).toContainText("After");
	await expect(result).toContainText("Images");
	await expect(result).toContainText(/% smaller/);
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PDF" }),
	);
	expect(filename).toBe("image-heavy-compressed.pdf");
	expect(signatureOf(bytes)).toBe("pdf");
	expect(bytes.length).toBeLessThan(
		readFileSync(FIXTURES.imageHeavy).byteLength,
	);

	const document = await PDFDocument.load(bytes);
	expect(document.getPageCount()).toBe(2);
	const annotations = document
		.getPage(0)
		.node.lookup(PDFName.of("Annots"), PDFArray);
	expect(annotations.size()).toBe(1);

	const viewer = await context.newPage();
	await viewer.goto("/pdf-viewer");
	await viewer
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles({
			name: filename,
			mimeType: "application/pdf",
			buffer: Buffer.from(bytes),
		});
	await expect(viewer.getByTestId("pdf-page")).toHaveAttribute(
		"data-rendered-page",
		"1",
		{ timeout: 30_000 },
	);
	await expect(viewer.getByRole("spinbutton", { name: /Page/ })).toHaveValue(
		"1",
	);
	await expect(viewer.getByTestId("pdf-viewer-error")).toHaveCount(0);
});

test("pdf compressor re-encodes a flate image and keeps its link", async ({
	page,
}) => {
	test.setTimeout(180_000);
	await page.goto("/pdf-compressor");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.flateImage]);
	await page.getByRole("combobox", { name: "Quality" }).click();
	await page.getByRole("option", { name: /Low/ }).click();
	await page.getByRole("button", { name: "Compress PDF" }).click();
	const result = page.getByTestId("compress-result");
	await expect(result).toBeVisible({ timeout: 120_000 });
	await expect(result).toContainText("1 of 1 re-encoded");
	const { bytes } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PDF" }),
	);
	expect(bytes.length).toBeLessThan(
		readFileSync(FIXTURES.flateImage).byteLength,
	);
	const document = await PDFDocument.load(bytes);
	const images = document.context
		.enumerateIndirectObjects()
		.filter(
			(entry): entry is [PDFRef, PDFRawStream] =>
				entry[1] instanceof PDFRawStream &&
				entry[1].dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
		);
	expect(images).toHaveLength(1);
	const dict = images[0]?.[1].dict;
	expect(dict?.get(PDFName.of("Filter"))?.toString()).toBe("/DCTDecode");
	expect(dict?.get(PDFName.of("Width"))?.toString()).toBe("612");
	const annotations = document
		.getPage(0)
		.node.lookup(PDFName.of("Annots"), PDFArray);
	expect(annotations.size()).toBe(1);
});

test("pdf compressor leaves a text only pdf untouched", async ({ page }) => {
	test.setTimeout(180_000);
	await page.goto("/pdf-compressor");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pdf]);
	await page.getByRole("combobox", { name: "Quality" }).click();
	await page.getByRole("option", { name: /Low/ }).click();
	await page.getByRole("button", { name: "Compress PDF" }).click();
	const result = page.getByTestId("compress-result");
	await expect(result).toBeVisible({ timeout: 120_000 });
	await expect(result).toContainText("Almost the same size");
	await expect(result).toContainText("no embedded images");
	const { bytes } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PDF" }),
	);
	expect(bytes).toEqual(new Uint8Array(readFileSync(FIXTURES.pdf)));
});
