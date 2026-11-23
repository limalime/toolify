import { expect, test } from "@playwright/test";
import { FIXTURES } from "./helpers";

const AUDIO_TOOLS = [
	{ slug: "audio-converter", fixture: FIXTURES.toneMp3 },
	{ slug: "audio-speed", fixture: FIXTURES.toneMp3 },
	{ slug: "adjust-audio", fixture: FIXTURES.toneMp3 },
	{ slug: "trim-audio", fixture: FIXTURES.toneMp3 },
	{ slug: "mp4-to-mp3", fixture: FIXTURES.video },
	{ slug: "join-audio", fixture: FIXTURES.toneMp3 },
];

for (const tool of AUDIO_TOOLS) {
	test(`${tool.slug} previews the uploaded audio before converting`, async ({
		page,
	}) => {
		await page.goto(`/${tool.slug}`);
		await page
			.locator("[data-testid='dropzone'] input[type='file']")
			.first()
			.setInputFiles([tool.fixture]);
		const preview = page.getByTestId("source-audio-preview").first();
		await expect(preview).toBeVisible();
		await expect(preview).toHaveAttribute("controls", "");
		const src = await preview.getAttribute("src");
		expect(src).toMatch(/^blob:/);
	});
}