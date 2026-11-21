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
	await page.getByTestId("notes-editor").fill("My first note");
	await expect(page.getByTestId("notes-saved")).toContainText("Saved");
	await page.reload();
	await expect(page.getByTestId("notes-editor")).toHaveValue("My first note");
});

test("exports everything as markdown", async ({ page }) => {
	await page.getByRole("button", { name: "New note" }).click();
	await page.getByTestId("notes-editor").fill("Export me");
	await expect(page.getByTestId("notes-saved")).toContainText("Saved");
	const { bytes, filename } = await downloadBytes(
		page,
		page.getByRole("button", { name: "Export all" }),
	);
	expect(filename).toBe("notes.md");
	expect(new TextDecoder().decode(bytes)).toContain("Export me");
});
