import { expect, test } from "@playwright/test";

test("homepage loads with brand fonts", async ({ page }) => {
	const res = await page.goto("/");
	expect(res?.ok()).toBe(true);

	const fonts = await page.evaluate(async () => {
		const loaded = async (family: string) => {
			try {
				await document.fonts.load(`16px "${family}"`);
				return document.fonts.check(`16px "${family}"`);
			} catch {
				return false;
			}
		};
		return {
			calsans: await loaded("CalSans"),
			interLoaded: Array.from(document.fonts).some(
				(face) => face.family.includes("Inter") && face.status === "loaded",
			),
			bodyFont: getComputedStyle(document.body).fontFamily,
		};
	});

	expect(fonts.calsans).toBe(true);
	expect(fonts.interLoaded).toBe(true);
	expect(fonts.bodyFont).toContain("Inter");
});

test("logo asset serves as png", async ({ page }) => {
	const res = await page.request.get("/assets/logo-blue-square-1080.png");
	expect(res.ok()).toBe(true);
	expect(res.headers()["content-type"]).toContain("image/png");
});
