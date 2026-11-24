import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";
import {
	downloadBytes,
	FIXTURES,
	mediaProbe,
	PHONE_FIXTURES,
	signatureOf,
} from "./helpers";
import { routeVideo } from "./video";

// real phones hand these containers over. chromium cannot decode them,
// which is exactly the case that used to fail with a generic message.

test.beforeEach(async ({ page }) => {
	test.setTimeout(420000);
	await page.goto("/video-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Converter",
	);
	await routeVideo(page);
});

test("converts an hevc mov from a phone", async ({ page }) => {
	test.skip(!existsSync(PHONE_FIXTURES.hevc), "run npm run fixtures:phone");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.hevc]);
	const convert = page.getByRole("button", { name: "Convert video" });
	await expect(convert).toBeEnabled();
	await convert.click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const { bytes, filename } = await downloadBytes(page, download);
	expect(filename).toMatch(/\.mp4$/);
	expect(signatureOf(bytes)).toBe("mp4");
	const probe = await mediaProbe(page, bytes, "video/mp4");
	expect(probe.width).toBe(540);
	expect(probe.height).toBe(960);
});

test("converts a 3gp clip with h263 video", async ({ page }) => {
	test.skip(!existsSync(PHONE_FIXTURES.h263), "run npm run fixtures:phone");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.h263]);
	const convert = page.getByRole("button", { name: "Convert video" });
	await expect(convert).toBeEnabled();
	await convert.click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp4");
});

test("takes a large 1080p phone clip without a size lie", async ({ page }) => {
	test.skip(!existsSync(PHONE_FIXTURES.large), "run npm run fixtures:phone");
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.large]);
	const convert = page.getByRole("button", { name: "Convert video" });
	await expect(convert).toBeEnabled();
	await expect(page.getByText("This file is too big")).toHaveCount(0);
	await convert.click();
	// the point is that the 40 MB file is accepted and the engine really
	// starts on it, not that the whole encode fits in a test budget.
	const status = page.getByTestId("video-job-status");
	await expect(status).toBeVisible();
	await expect
		.poll(async () => Number(await status.getAttribute("data-max-progress")), {
			timeout: 300000,
		})
		.toBeGreaterThan(0);
	expect(
		await page.getByText("The media engine ran out of memory").count(),
	).toBe(0);
	expect(await page.getByText("Something went wrong").count()).toBe(0);
});

test("crops an hevc mov by reading its container", async ({ page }) => {
	test.skip(!existsSync(PHONE_FIXTURES.hevc), "run npm run fixtures:phone");
	await page.goto("/crop-video");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Cropper",
	);
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.hevc]);
	// a portrait clip: the 16:9 box is full width, so the output stays
	// 540 wide and gets shorter.
	await page.getByRole("button", { name: "16:9", exact: true }).click();
	await page.getByRole("button", { name: "Crop video" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp4");
	const probe = await mediaProbe(page, bytes, "video/mp4");
	expect(probe.width).toBe(540);
	expect(probe.height).toBe(304);
});

test("names the format when a file is not video at all", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([FIXTURES.pdf]);
	await expect(
		page.getByText("That PDF file is not a video this tool can read"),
	).toBeVisible();
});

test("converts a phone mov to mp3", async ({ page }) => {
	test.skip(!existsSync(PHONE_FIXTURES.hevc), "run npm run fixtures:phone");
	await page.goto("/mp4-to-mp3");
	await routeVideo(page);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.hevc]);
	await page.getByRole("button", { name: "Extract MP3" }).click();
	const download = page.getByRole("button", { name: "Download" });
	await expect(download).toBeVisible({ timeout: 300000 });
	const { bytes } = await downloadBytes(page, download);
	expect(signatureOf(bytes)).toBe("mp3");
	const probe = await mediaProbe(page, bytes, "audio/mpeg");
	expect(probe.duration).toBeGreaterThan(2);
	expect(probe.duration).toBeLessThan(4);
});

test("converts the same clip twice without a reload", async ({
	page,
	isMobile,
}) => {
	test.skip(!isMobile, "phone viewport only");
	// a worker per job is what gives each conversion a clean wasm heap.
	// count the blob workers the page starts, then require one more per
	// round. the hook has to be installed before a document runs, and
	// beforeEach already navigated, so the goto below reloads once.
	await page.addInitScript(() => {
		const harness = { blobWorkers: 0 };
		(window as unknown as { __ffmpegHarness: typeof harness }).__ffmpegHarness =
			harness;
		const OriginalWorker = window.Worker;
		window.Worker = class extends OriginalWorker {
			constructor(url: string | URL, options?: WorkerOptions) {
				super(url, options);
				if (String(url).startsWith("blob:")) {
					harness.blobWorkers += 1;
				}
			}
		} as typeof Worker;
	});
	await page.goto("/video-converter");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Video Converter",
	);
	expect(await page.evaluate(() => globalThis.crossOriginIsolated)).toBe(true);
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([PHONE_FIXTURES.repeat]);

	const convert = page.getByRole("button", { name: "Convert video" });
	const download = page.getByRole("button", { name: "Download" });
	const workers = () =>
		page.evaluate(
			() =>
				(
					window as unknown as {
						__ffmpegHarness: { blobWorkers: number };
					}
				).__ffmpegHarness.blobWorkers,
		);
	const baseline = await workers();

	for (const round of [1, 2]) {
		await convert.click();
		await expect(download).toBeHidden();
		await expect(download).toBeVisible({ timeout: 300000 });
		await expect(
			page.getByText("The media engine ran out of memory"),
		).toHaveCount(0);
		// the previous job's worker is gone and this job got its own. a
		// conversion that reused the old heap is exactly the old bug.
		expect(await workers()).toBe(baseline + round);
		const { bytes, filename } = await downloadBytes(page, download);
		expect(filename).toMatch(/\.mp4$/);
		expect(signatureOf(bytes)).toBe("mp4");
	}
});
