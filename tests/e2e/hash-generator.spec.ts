import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
	await page.goto("/hash-generator");
	await expect(page.getByRole("heading", { level: 1 })).toContainText(
		"Free Online Hash Generator",
	);
	await page.getByLabel("Text", { exact: true }).fill("abc");
});

test("hashes to known vectors", async ({ page }) => {
	await expect(page.getByTestId("hash-md5")).toContainText(
		"900150983cd24fb0d6963f7d28e17f72",
	);
	await expect(page.getByTestId("hash-sha256")).toContainText(
		"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
	);
	await expect(page.getByTestId("hash-sha512")).toContainText(
		"ddaf35a193617abacc417349ae20413112e6fa4",
	);
});

test("copies one hash at a time", async ({ page, context }) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page
		.getByTestId("hash-sha1")
		.getByRole("button", { name: "Copy" })
		.click();
	const clip = await page.evaluate(() => navigator.clipboard.readText());
	expect(clip).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
});
