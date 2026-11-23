import { expect, test } from "@playwright/test";
import { downloadBytes, imageDims, signatureOf } from "./helpers";

test("instagram generator exports a story mockup", async ({ page }) => {
	await page.goto("/instagram-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Instagram Post Generator",
	);
	await expect(page.getByTestId("instagram-canvas")).toBeVisible();
	await page.getByLabel("Username").fill("toolify");
	await page.getByRole("tab", { name: "Story" }).click();
	await page.getByLabel("Caption").fill("Everything runs in your browser.");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(filename).toBe("instagram-story.png");
	expect(signatureOf(bytes)).toBe("png");
	expect(await imageDims(page, bytes)).toEqual({ width: 1080, height: 1920 });
});

test("instagram generator switches to the DM layout", async ({ page }) => {
	await page.goto("/instagram-generator");
	await page.getByRole("tab", { name: "DM" }).click();
	await page.getByLabel("Incoming message").fill("Is it free?");
	await page.getByLabel("Your reply").fill("Yes, no limits.");
	await expect(page.getByTestId("instagram-canvas")).toBeVisible();
});

test("x generator exports a post and a profile", async ({ page }) => {
	await page.goto("/x-post-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free X Post Generator",
	);
	await page.getByLabel("Display name").fill("Toolify");
	await page.getByLabel("Post text").fill("Every tool you need.");
	const post = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(post.filename).toBe("x-post.png");
	expect(signatureOf(post.bytes)).toBe("png");

	await page.getByRole("tab", { name: "Profile" }).click();
	await page.getByLabel("Bio").fill("Small browser tools.");
	const profile = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(profile.filename).toBe("x-profile.png");
	expect(signatureOf(profile.bytes)).toBe("png");
});

for (const platform of [
	{
		slug: "messenger-generator",
		title: "Free Messenger Chat Generator",
		name: "Sam Rivera",
	},
	{
		slug: "whatsapp-generator",
		title: "Free WhatsApp Chat Generator",
		name: "Alex",
	},
	{
		slug: "imessage-generator",
		title: "Free iMessage Chat Generator",
		name: "Jamie",
	},
]) {
	test(`${platform.slug} renders and exports a chat`, async ({ page }) => {
		await page.goto(`/${platform.slug}`);
		await expect(page.getByRole("heading", { level: 1 })).toContainText(
			platform.title,
		);
		await expect(page.getByLabel("Contact name")).toHaveValue(platform.name);
		await page.getByLabel("Contact name").fill("Ming");
		await page.getByRole("button", { name: "Add message" }).click();
		const boxes = page.getByLabel("Message", { exact: true });
		await boxes.last().fill("One more line.");
		await expect(page.getByTestId("chat-canvas")).toBeVisible();
		const { bytes, filename } = await downloadBytes(
			page,
			page.getByRole("button", { name: "Download PNG" }),
		);
		expect(filename).toBe(`${platform.slug}-chat.png`);
		expect(signatureOf(bytes)).toBe("png");
	});
}