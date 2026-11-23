import { expect, test } from "@playwright/test";
import { downloadBytes } from "./helpers";

test.beforeEach(async ({ page }) => {
	await page.goto("/online-notes");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Notes",
	);
});

test("creates, autosaves, and keeps notes across reload", async ({ page }) => {
	await page.getByRole("button", { name: "New note" }).click();
	await page.getByLabel("Title").fill("My first note");
	await page.getByTestId("notes-editor").fill("Body text");
	await expect(page.getByTestId("notes-saved")).toContainText("Saved");
	await page.reload();
	await expect(page.getByLabel("Title")).toHaveValue("My first note");
	await expect(page.getByTestId("notes-editor")).toContainText("Body text");
});

test("exports everything as markdown", async ({ page }) => {
	await page.getByRole("button", { name: "New note" }).click();
	await page.getByLabel("Title").fill("Export me");
	await page.getByTestId("notes-editor").fill("Export body");
	await expect(page.getByTestId("notes-saved")).toContainText("Saved");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Export all" }),
	);
	expect(filename).toBe("notes.md");
	const text = new TextDecoder().decode(bytes);
	expect(text).toContain("Export me");
	expect(text).toContain("Export body");
});

test("shares a note through a self contained link", async ({ page }) => {
	await page.getByRole("button", { name: "New note" }).click();
	await page.getByLabel("Title").fill("Shared plan");
	await page.getByTestId("notes-editor").fill("Ship it on Friday.");
	await page.getByRole("button", { name: "Share note" }).click();
	const link = await page.getByLabel("Share link").inputValue();
	expect(link).toContain("/online-notes/");
	const path = new URL(link).pathname;
	await page.goto(path);
	await expect(page.getByRole("heading", { name: "Shared plan" })).toBeVisible();
	await expect(page.getByText("Ship it on Friday.")).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Write your own note" }),
	).toBeVisible();
});

test("edits through the markdown view", async ({ page }) => {
	await page.getByRole("button", { name: "New note" }).click();
	await page.getByRole("button", { name: "Markdown" }).click();
	const markdown = page.getByTestId("notes-markdown");
	await markdown.fill("# Plan\n\n- one\n- two");
	await page.getByRole("button", { name: "Markdown" }).click();
	await expect(page.getByTestId("notes-editor").locator("h1")).toHaveText(
		"Plan",
	);
	await expect(page.getByTestId("notes-editor").locator("li")).toHaveCount(2);
});