import { expect, test } from "@playwright/test";
import { downloadBytes } from "./helpers";

test("lorem ipsum generates controlled amounts of text", async ({ page }) => {
	await page.goto("/lorem-ipsum");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Lorem Ipsum Generator",
	);
	const output = page.getByTestId("lorem-output");
	await expect(output).not.toHaveValue("");
	const first = await output.inputValue();
	expect(first.length).toBeGreaterThan(80);
	await page.getByRole("combobox", { name: "Paragraphs" }).click();
	await page.getByRole("option", { name: "2", exact: true }).click();
	await page.getByRole("button", { name: "Generate text" }).click();
	const second = await output.inputValue();
	expect(second).not.toBe(first);
	const paragraphs = second.split("\n\n").filter(Boolean);
	expect(paragraphs).toHaveLength(2);
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Download TXT" }),
	);
	expect(filename).toBe("lorem-ipsum.txt");
	expect(new TextDecoder().decode(bytes)).toBe(second);
});

test("code validator accepts valid JSON and rejects broken JSON", async ({
	page,
}) => {
	await page.goto("/code-validator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Code Validator",
	);
	await page.getByRole("button", { name: "Check code" }).click();
	await expect(page.getByTestId("validator-result")).toContainText(
		"Looks valid",
	);
	const input = page.getByTestId("validator-input");
	await input.fill('{"name": "Toolify",}');
	await page.getByRole("button", { name: "Check code" }).click();
	await expect(page.getByTestId("validator-result")).toContainText(
		"Found a problem",
	);
	await input.fill("");
	await page.getByRole("button", { name: "Check code" }).click();
	await expect(page.getByTestId("validator-result")).toContainText(
		"Paste some code first.",
	);
});

test("code validator switches language and checks HTML balance", async ({
	page,
}) => {
	await page.goto("/code-validator");
	await page.getByRole("combobox", { name: "Language" }).click();
	await page.getByRole("option", { name: "HTML" }).click();
	await page.getByTestId("validator-input").fill("<div><span></div>");
	await page.getByRole("button", { name: "Check code" }).click();
	await expect(page.getByTestId("validator-result")).toContainText(
		"Check these tags",
	);
});

test("calculator evaluates, keeps history, and clears", async ({ page }) => {
	await page.goto("/calculator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Calculator",
	);
	for (const key of ["7", "+", "8", "="]) {
		await page.getByRole("button", { name: key, exact: true }).click();
	}
	await expect(page.getByTestId("calculator-display")).toHaveValue("15");
	await expect(page.getByTestId("calculator-history")).toContainText("7+8");
	await expect(page.getByTestId("calculator-history")).toContainText("= 15");
	await page.getByRole("button", { name: "Clear", exact: true }).click();
	await expect(page.getByTestId("calculator-display")).toHaveValue("");
});

test("calculator reports division by zero", async ({ page }) => {
	await page.goto("/calculator");
	for (const key of ["9", "÷", "0", "="]) {
		await page.getByRole("button", { name: key, exact: true }).click();
	}
	await expect(page.getByTestId("tool-shell").getByRole("alert")).toContainText(
		"Cannot divide by zero.",
	);
});

test("spin wheel picks one of the listed options", async ({ page }) => {
	await page.goto("/spin-wheel");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Spin Wheel",
	);
	const canvas = page.getByTestId("spin-canvas");
	await expect
		.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width))
		.toBeGreaterThan(300);
	await page.getByRole("button", { name: "Spin the wheel" }).click();
	const result = page.getByTestId("spin-result");
	await expect(result).toBeVisible({ timeout: 8000 });
	await expect(result).toHaveText(
		/^(Pizza|Sushi|Burger|Salad|Tacos|Pasta)$/,
	);
});

test("spin wheel takes colors, an image, shuffle and a share link", async ({
	page,
}) => {
	await page.goto("/spin-wheel");
	const canvas = page.getByTestId("spin-canvas");
	await expect
		.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width))
		.toBeGreaterThan(300);
	const paint = () =>
		canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());

	const before = await paint();
	await page.locator('[data-testid="spin-colors"] input').first().evaluate(
		(node) => {
			const input = node as HTMLInputElement;
			const setter = Object.getOwnPropertyDescriptor(
				HTMLInputElement.prototype,
				"value",
			)?.set;
			setter?.call(input, "#00ff00");
			input.dispatchEvent(new Event("input", { bubbles: true }));
			input.dispatchEvent(new Event("change", { bubbles: true }));
		},
	);
	await expect.poll(paint).not.toBe(before);

	const options = page.getByTestId("spin-options");
	const original = await options.inputValue();
	await page.getByTestId("spin-shuffle").click();
	await expect(options).not.toHaveValue(original);

	await page
		.getByTestId("spin-image-input")
		.setInputFiles(["tests/fixtures/logo.png"]);
	await expect(page.getByText("logo.png")).toBeVisible();

	await page.getByTestId("spin-share").click();
	await expect(page.getByTestId("spin-share-url")).toHaveValue(/#wheel=.+/);
	const shared = await options.inputValue();
	const link = await page.getByTestId("spin-share-url").inputValue();
	await page.goto(link);
	await expect(page.getByTestId("spin-options")).toHaveValue(shared);
});

test("spin wheel refuses a single option", async ({ page }) => {
	await page.goto("/spin-wheel");
	const canvas = page.getByTestId("spin-canvas");
	await expect
		.poll(() => canvas.evaluate((node) => (node as HTMLCanvasElement).width))
		.toBeGreaterThan(300);
	await page.getByLabel("Options").fill("Only one");
	await page.getByRole("button", { name: "Spin the wheel" }).click();
	await expect(page.getByTestId("tool-shell").getByRole("alert")).toContainText(
		"Add at least two options.",
	);
});