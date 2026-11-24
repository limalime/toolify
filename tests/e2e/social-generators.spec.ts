import { expect, type Page, test } from "@playwright/test";
import { downloadBytes, FIXTURES, imageDims, signatureOf } from "./helpers";

test("instagram generator exports a story mockup", async ({ page }) => {
	await page.goto("/instagram-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Instagram Post Generator",
	);
	await expect(page.getByTestId("instagram-canvas")).toBeVisible();
	await page.getByLabel("Username").fill("toolify");
	await page.getByRole("tab", { name: "Story" }).click();
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

// samples one pixel of an exported png so the test can tell a drawn photo
// bubble from the plain background.
async function pixelAt(
	page: Page,
	bytes: Uint8Array,
	x: number,
	y: number,
): Promise<[number, number, number]> {
	return page.evaluate(
		({ raw, px, py }) => {
			const url = URL.createObjectURL(
				new Blob([Uint8Array.from(raw)], { type: "image/png" }),
			);
			return new Promise<[number, number, number]>((resolve, reject) => {
				const image = new Image();
				image.onload = () => {
					const canvas = document.createElement("canvas");
					canvas.width = image.naturalWidth;
					canvas.height = image.naturalHeight;
					const context = canvas.getContext("2d");
					if (!context) {
						reject(new Error("no 2d context"));
						return;
					}
					context.drawImage(image, 0, 0);
					const data = context.getImageData(px, py, 1, 1).data;
					URL.revokeObjectURL(url);
					resolve([data[0], data[1], data[2]]);
				};
				image.onerror = () => reject(new Error("could not decode image"));
				image.src = url;
			});
		},
		{ raw: Array.from(bytes), px: x, py: y },
	);
}

test("instagram DM labels both avatars", async ({ page }) => {
	await page.goto("/instagram-generator");
	await page.getByRole("tab", { name: "DM" }).click();
	await expect(page.getByText("Avatar 1", { exact: true })).toBeVisible();
	await expect(page.getByText("Avatar 2", { exact: true })).toBeVisible();
	await expect(page.locator("input[aria-label='Avatar 1']")).toHaveCount(1);
	await expect(page.locator("input[aria-label='Avatar 2']")).toHaveCount(1);
});

test("instagram DM export drops the photo bubble without an image", async ({
	page,
}) => {
	await page.goto("/instagram-generator");
	await page.getByRole("tab", { name: "DM" }).click();
	await page.getByLabel("Incoming message").fill("Is it free?");
	await page.getByLabel("Your reply").fill("Yes, no limits.");
	const plain = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	expect(plain.filename).toBe("instagram-dm.png");
	expect(signatureOf(plain.bytes)).toBe("png");
	// the photo bubble would cover this spot. with no upload it stays
	// black background, so nothing of the image template remains.
	const empty = await pixelAt(page, plain.bytes, 700, 600);
	expect(empty).toEqual([0, 0, 0]);

	await page
		.locator("input[aria-label='Add image']")
		.setInputFiles([FIXTURES.photo]);
	await expect(page.getByRole("button", { name: "photo.png" })).toBeVisible();
	const withImage = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download PNG" }),
	);
	const filled = await pixelAt(page, withImage.bytes, 700, 600);
	expect(filled).not.toEqual([0, 0, 0]);
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
		await page.getByLabel("Contact name").fill("Nadia");
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
