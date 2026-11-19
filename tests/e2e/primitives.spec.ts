import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/internal/primitives");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Primitives",
	);
});

test("page fits the viewport width", async ({ page }) => {
	const overflow = await page.evaluate(
		() =>
			document.documentElement.scrollWidth -
			document.documentElement.clientWidth,
	);
	expect(overflow).toBeLessThanOrEqual(1);
});

test("keyboard tab shows a visible focus ring", async ({ page }) => {
	await page.keyboard.press("Tab");
	const outline = await page.evaluate(() => {
		const active = document.activeElement;
		if (!(active instanceof HTMLElement)) {
			return "none";
		}
		return getComputedStyle(active).outlineWidth;
	});
	expect(outline).not.toBe("0px");
});

test("primary button is the brand blue", async ({ page }) => {
	const convert = page.getByRole("button", { name: "Convert" });
	await expect(convert).toBeVisible();
	expect(
		await convert.evaluate((node) => getComputedStyle(node).backgroundColor),
	).toBe("rgb(27, 86, 253)");
});

test("checkbox turns blue when checked", async ({ page }) => {
	const box = page.getByRole("checkbox", { name: "Add watermark" });
	await box.click();
	await expect
		.poll(async () =>
			box.evaluate((node) => getComputedStyle(node).backgroundColor),
		)
		.toBe("rgb(27, 86, 253)");
});

test("switch toggles on and off", async ({ page }) => {
	const toggle = page.getByRole("switch", { name: "Keep aspect ratio" });
	await expect(toggle).toHaveAttribute("aria-checked", "true");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("radio group selects one option", async ({ page }) => {
	const percent = page.getByRole("radio", { name: "By percent" });
	await percent.click();
	await expect(percent).toHaveAttribute("aria-checked", "true");
});

test("select picks an option and confirms with a toast", async ({ page }) => {
	await page.getByRole("combobox", { name: "Output format" }).click();
	await page.getByRole("option", { name: "PNG image" }).click();
	await expect(
		page.getByRole("combobox", { name: "Output format" }),
	).toContainText("PNG image");
	await expect(page.locator("[data-slot='toast-viewport']")).toContainText(
		"Format picked: png",
	);
});

test("slider moves with arrow keys and shows the value", async ({ page }) => {
	const slider = page.getByRole("slider", { name: "Quality" });
	await slider.focus();
	await page.keyboard.press("ArrowRight");
	await expect(page.locator("output")).toContainText("86");
});

test("tabs switch panels", async ({ page }) => {
	await page.getByRole("tab", { name: "Compress" }).click();
	await expect(page.getByRole("tabpanel")).toContainText(
		"Compress picks a target size",
	);
});

test("accordion expands the second answer", async ({ page }) => {
	await page
		.getByRole("button", { name: "Is there a file size limit" })
		.click();
	await expect(
		page.getByText("Heavy tools cap the input size and say so up front."),
	).toBeVisible();
});

test("dialog opens and closes", async ({ page }) => {
	await page.getByRole("button", { name: "Open dialog" }).click();
	const dialog = page.getByRole("dialog");
	await expect(dialog).toContainText("Remove file");
	await page.keyboard.press("Escape");
	await expect(dialog).toBeHidden({ timeout: 3000 });
});

test("success toast fires and error toast persists", async ({ page }) => {
	await page.getByRole("button", { name: "Fire success" }).click();
	await expect(page.locator("[data-slot='toast-viewport']")).toContainText(
		"Saved",
	);
	await page.getByRole("button", { name: "Fire error" }).click();
	const viewport = page.locator("[data-slot='toast-viewport']");
	await expect(viewport).toContainText("Could not read file");
	await expect(
		viewport.locator("[data-slot='toast'].border-s-error"),
	).toBeVisible();
});

test("progress bar exposes its value", async ({ page }) => {
	const section = page.getByTestId("section-progress");
	const bar = section.getByRole("progressbar", {
		name: "Converting vacation.mp4",
	});
	await expect(bar).toHaveAttribute("aria-valuenow", "65");
	await expect(section.getByText("65", { exact: false })).toBeVisible();
});

test("dropzone lists picked files", async ({ page }) => {
	await page
		.locator("[data-testid='dropzone'] input[type='file']")
		.setInputFiles([
			{ buffer: Buffer.from("demo"), mimeType: "image/png", name: "demo.png" },
		]);
	await expect(page.getByText("demo.png")).toBeVisible();
});

test("file list shows all four statuses with actions", async ({ page }) => {
	const list = page.getByTestId("file-list");
	await expect(list.locator("[data-status='queued']")).toContainText(
		"photo.png",
	);
	await expect(list.locator("[data-status='processing']")).toContainText(
		"vacation.mp4",
	);
	await expect(list.locator("[data-status='done']")).toContainText("notes.pdf");
	await expect(list.locator("[data-status='failed']")).toContainText(
		"Could not read this file",
	);
	await expect(list.locator("[data-status='done'] a")).toHaveText("Download");
	await expect(list.locator("[data-status='failed'] button")).toHaveText(
		"Retry",
	);
});

test("loading pairs the logo with a status line", async ({ page }) => {
	const loading = page.getByTestId("loading");
	await expect(loading.getByRole("img", { name: "Toolify" })).toBeVisible();
	await expect(loading).toContainText("Converting 3 of 5 files");
});

test("sharp corners on every control", async ({ page }) => {
	await page.getByRole("button", { name: "Fire success" }).click();
	await expect(page.locator("[data-slot='toast']")).toBeVisible();
	const radius = await page.evaluate(() => {
		const slots = [
			"switch",
			"switch-thumb",
			"checkbox",
			"radio-group-item",
			"slider-thumb",
			"progress-track",
			"progress-indicator",
			"badge",
			"toast",
		];
		const result: Record<string, string> = {};
		for (const slot of slots) {
			const node = document.querySelector(`[data-slot='${slot}']`);
			result[slot] =
				node instanceof HTMLElement
					? getComputedStyle(node).borderRadius
					: "missing";
		}
		return result;
	});
	for (const [slot, value] of Object.entries(radius)) {
		expect(`${slot}: ${value}`).toBe(`${slot}: 0px`);
	}
});

test.describe("reduced motion", () => {
	test.use({ reducedMotion: "reduce" });

	test("skeleton renders static with no shimmer sweep", async ({ page }) => {
		await expect(page.locator("[data-slot='skeleton']").first()).toBeVisible();
		await expect(page.locator("[data-slot='skeleton-shimmer']")).toHaveCount(0);
	});

	test("toast still fires without animation", async ({ page }) => {
		await page.getByRole("button", { name: "Fire success" }).click();
		await expect(page.locator("[data-slot='toast-viewport']")).toContainText(
			"Saved",
		);
	});
});
