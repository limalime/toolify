import { expect, test } from "@playwright/test";
import { STATIC_ROUTES } from "../../src/lib/site-routes";
import { TOOLS } from "../../src/lib/tools";

const PAGES = [...STATIC_ROUTES, ...TOOLS.map((tool) => `/${tool.slug}`)];

test("header controls show a visible focus ring", async ({ page }) => {
	await page.goto("/");
	let checked = 0;
	for (let step = 0; step < 12; step += 1) {
		await page.keyboard.press("Tab");
		const focused = await page.evaluate(() => {
			const node = document.activeElement as HTMLElement | null;
			if (!node || node === document.body || !node.closest("header")) {
				return null;
			}
			const style = getComputedStyle(node);
			const shadow = style.boxShadow;
			return {
				label:
					node.getAttribute("aria-label") ??
					(node.textContent ?? "").trim().slice(0, 40),
				outline: `${style.outlineStyle} ${style.outlineWidth}`,
				shadow,
				visible:
					(style.outlineStyle !== "none" &&
						Number.parseFloat(style.outlineWidth) >= 2) ||
					(shadow !== "none" && shadow !== ""),
			};
		});
		if (!focused) continue;
		checked += 1;
		expect(focused.visible, `no focus ring on ${focused.label}`).toBe(true);
	}
	expect(checked).toBeGreaterThanOrEqual(5);
});

test("every page keeps one h1, ordered headings, and image alts", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "chromium-mobile", "one viewport is enough");
	test.setTimeout(300_000);
	for (const path of PAGES) {
		await page.goto(path);
		const audit = await page.evaluate(() => {
			const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
				(node) => Number(node.tagName.slice(1)),
			);
			const skips: string[] = [];
			let last = 0;
			for (const level of headings) {
				if (last && level > last + 1) {
					skips.push(`h${last} to h${level}`);
				}
				last = level;
			}
			const images = [...document.querySelectorAll("img")].filter(
				(node) => !node.hasAttribute("alt") && !node.closest("[aria-hidden]"),
			).length;
			return {
				h1: headings.filter((level) => level === 1).length,
				skips,
				images,
			};
		});
		expect(audit.h1, `${path} h1 count`).toBe(1);
		expect(audit.skips, `${path} heading order`).toEqual([]);
		expect(audit.images, `${path} images without alt`).toBe(0);
	}
});

test("form controls on tool pages have accessible names", async ({
	page,
}, testInfo) => {
	test.skip(testInfo.project.name !== "chromium-mobile", "one viewport is enough");
	test.setTimeout(300_000);
	const controls = TOOLS.map((tool) => `/${tool.slug}`);
	for (const path of controls) {
		await page.goto(path);
		await page.waitForTimeout(800);
		const unnamed = await page.evaluate(() => {
			const nodes = [...document.querySelectorAll("input,select,textarea")];
			return nodes
				.filter((node) => {
					const element = node as HTMLInputElement;
					if (element.type === "hidden") return false;
					if (element.closest("[aria-hidden='true']")) return false;
					if (
						element.getAttribute("aria-label") ||
						element.getAttribute("aria-labelledby")
					) {
						return false;
					}
					if (element.id) {
						const label = document.querySelector(
							`label[for="${CSS.escape(element.id)}"]`,
						);
						if (label) return false;
					}
					if (element.closest("label")) return false;
					return true;
				})
				.map(
					(element) =>
						`${element.tagName.toLowerCase()} ${element.getAttribute("type") ?? ""} ${element.id || "(no id)"}`,
				);
		});
		expect(unnamed, `${path} controls`).toEqual([]);
	}
});