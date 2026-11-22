import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { downloadBytes, signatureOf } from "./helpers";

async function makePdf(sizes: Array<[number, number]>): Promise<Buffer> {
	const doc = await PDFDocument.create();
	for (const [width, height] of sizes) {
		doc.addPage([width, height]);
	}
	return Buffer.from(await doc.save());
}

async function pageSizes(bytes: Uint8Array): Promise<Array<[number, number]>> {
	const doc = await PDFDocument.load(bytes);
	return doc.getPages().map((page) => {
		const box = page.getMediaBox();
		return [box.width, box.height] as [number, number];
	});
}

test.beforeEach(async ({ page }) => {
	test.setTimeout(180_000);
	await page.goto("/pdf-merge-split");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free PDF Merge and Split",
	);
});

test("merges pdfs in the dragged order", async ({ page }) => {
	const alpha = await makePdf([
		[200, 300],
		[210, 310],
	]);
	const beta = await makePdf([[400, 500]]);

	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([
			{ name: "alpha.pdf", mimeType: "application/pdf", buffer: alpha },
			{ name: "beta.pdf", mimeType: "application/pdf", buffer: beta },
		]);
	await expect(page.getByTestId("pdf-file-0")).toContainText("alpha.pdf");
	await expect(page.getByTestId("pdf-file-1")).toContainText("beta.pdf");

	await page.getByTestId("pdf-file-1").dragTo(page.getByTestId("pdf-file-0"));
	await expect(page.getByTestId("pdf-file-0")).toContainText("beta.pdf");
	await expect(page.getByTestId("pdf-file-1")).toContainText("alpha.pdf");

	await page.getByTestId("pdf-action").click();
	const download = page.getByTestId("pdf-download");
	await expect(download).toBeVisible({ timeout: 60_000 });
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toBe("merged.pdf");
	expect(signatureOf(bytes)).toBe("pdf");
	expect(await pageSizes(bytes)).toEqual([
		[400, 500],
		[200, 300],
		[210, 310],
	]);
});

test("splits a pdf by page ranges and downloads a zip", async ({ page }) => {
	const source = await makePdf([
		[100, 110],
		[200, 210],
		[300, 310],
		[400, 410],
	]);

	await page.getByRole("tab", { name: "Split" }).click();
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles({
			name: "book.pdf",
			mimeType: "application/pdf",
			buffer: source,
		});
	await expect(page.getByTestId("pdf-page-count")).toContainText(
		"This PDF has 4 pages.",
	);

	await page.getByTestId("pdf-range").fill("1-2, 4");
	await expect(page.getByTestId("pdf-output-count")).toContainText(
		"2 output files",
	);
	await page.getByTestId("pdf-action").click();
	await expect(page.getByTestId("pdf-part-0")).toBeVisible({ timeout: 60_000 });

	expect(
		await pageSizes(
			(await downloadBytes(page, page.getByTestId("pdf-part-0"))).bytes,
		),
	).toEqual([
		[100, 110],
		[200, 210],
	]);
	expect(
		await pageSizes(
			(await downloadBytes(page, page.getByTestId("pdf-part-1"))).bytes,
		),
	).toEqual([[400, 410]]);

	const zip = await downloadBytes(page, page.getByTestId("pdf-download-all"));
	expect(zip.filename).toBe("split-pdfs.zip");
	expect(signatureOf(zip.bytes)).toBe("zip");
});

test("explains an impossible page range", async ({ page }) => {
	const source = await makePdf([
		[100, 100],
		[100, 100],
	]);

	await page.getByRole("tab", { name: "Split" }).click();
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles({
			name: "short.pdf",
			mimeType: "application/pdf",
			buffer: source,
		});
	await expect(page.getByTestId("pdf-page-count")).toBeVisible();
	await page.getByTestId("pdf-range").fill("3-4");
	await expect(page.getByTestId("pdf-range-error")).toContainText(
		"Pages must fall between 1 and 2",
	);
});
