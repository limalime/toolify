import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const OUT = "/data/home/workspace/toolify/public/featured";
const PHOTO = "/data/home/workspace/toolify/tests/fixtures/photo.png";

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
	viewport: { width: 1440, height: 1000 },
	deviceScaleFactor: 1,
	locale: "en-US",
	reducedMotion: "reduce",
});
const page = await context.newPage();

async function shot(slug, { path, setup } = {}) {
	const target = path ?? `/${slug}`;
	await page.goto(`${BASE}${target}`, { waitUntil: "networkidle" });
	await page.getByRole("heading", { level: 1 }).waitFor();
	const decline = page.getByRole("button", { name: "Decline" });
	await decline
		.waitFor({ state: "visible", timeout: 2500 })
		.then(() => decline.click())
		.catch(() => {});
	if (setup) {
		await setup();
	}
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(700);
	const box = await page
		.locator("[data-clarity-mask='true']")
		.first()
		.boundingBox();
	if (!box) {
		throw new Error(`no tool area on ${target}`);
	}
	const width = Math.min(box.width, 1120);
	const y = Math.max(0, box.y - 16);
	const height = Math.min(box.height + (box.y - y), width * 0.75, 840);
	await page.screenshot({
		path: `${OUT}/${slug}.jpg`,
		type: "jpeg",
		quality: 86,
		clip: { x: box.x, y, width, height },
	});
	console.log(`shot ${slug}`);
}

await shot("spin-wheel", {
	setup: async () => {
		await page.getByRole("button", { name: "Spin the wheel" }).click();
		await page.getByTestId("spin-result").waitFor();
	},
});

await shot("instagram-generator", {
	setup: async () => {
		await page.getByLabel("Username").fill("toolify");
		await page.getByLabel("Caption").fill("Everything runs in your browser.");
		await page.getByTestId("instagram-canvas").waitFor();
	},
});

await shot("whatsapp-generator");

await shot("meme-generator", {
	setup: async () => {
		await page.getByRole("button", { name: "Template 1", exact: true }).click();
		const stage = page.getByTestId("meme-preview");
		await stage.scrollIntoViewIfNeeded();
		await stage.waitFor();
		const dragLayer = async (text, toY) => {
			const box = await stage.boundingBox();
			const layer = stage.getByRole("button", { name: text, exact: true });
			const layerBox = await layer.boundingBox();
			if (!box || !layerBox) {
				throw new Error("no meme stage");
			}
			await page.mouse.move(
				layerBox.x + layerBox.width / 2,
				layerBox.y + layerBox.height / 2,
			);
			await page.mouse.down();
			await page.mouse.move(box.x + box.width / 2, box.y + box.height * toY, {
				steps: 8,
			});
			await page.mouse.up();
			await page.waitForTimeout(200);
		};
		await page.getByRole("button", { name: "Add text" }).click();
		await page.getByLabel("Text", { exact: true }).fill("WHEN THE TOOL");
		await stage.scrollIntoViewIfNeeded();
		await dragLayer("WHEN THE TOOL", 0.16);
		await page.getByRole("button", { name: "Add text" }).click();
		await page.getByLabel("Text", { exact: true }).fill("JUST WORKS");
		await stage.scrollIntoViewIfNeeded();
		await dragLayer("JUST WORKS", 0.84);
		await page.getByTestId("meme-preview").waitFor();
	},
});

await shot("online-notes", {
	setup: async () => {
		await page.getByRole("button", { name: "New note" }).click();
		await page.getByLabel("Title").fill("Launch checklist");
		await page
			.getByTestId("notes-editor")
			.fill("Draft the landing page.\nCheck every link.\nShip before Friday.");
		await page.waitForTimeout(500);
	},
});

await shot("qr-code-generator", {
	setup: async () => {
		await page.getByLabel("Text", { exact: true }).fill("https://toolify.bond");
		await page.getByRole("button", { name: "Generate QR" }).click();
		await page.waitForTimeout(700);
	},
});

await shot("color-palette");

await shot("calculator", {
	setup: async () => {
		for (const key of ["1", "5", "×", "2", "4", "="]) {
			await page.getByRole("button", { name: key, exact: true }).click();
		}
	},
});

await shot("ascii-art", {
	setup: async () => {
		await page.getByRole("tab", { name: "Image" }).click();
		await page
			.locator("[data-testid='dropzone'] input[type='file']")
			.setInputFiles([PHOTO]);
		await page.getByTestId("ascii-image-preview").waitFor();
		await page.waitForTimeout(900);
	},
});

await browser.close();
console.log("featured shots done");
