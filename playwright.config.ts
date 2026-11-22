import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	retries: 0,
	reporter: "list",
	use: {
		baseURL,
		trace: "on-first-retry",
		// every spec except the consent one starts with analytics declined,
		// so no banner covers the page and no tag script loads.
		storageState: {
			cookies: [],
			origins: [
				{
					origin: baseURL,
					localStorage: [{ name: "toolify.consent.v1", value: "denied" }],
				},
			],
		},
	},
	projects: [
		{
			name: "chromium-mobile",
			use: { ...devices["Pixel 7"] },
		},
		{
			name: "chromium-desktop",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `npm run dev -- --port ${PORT}`,
		url: baseURL,
		reuseExistingServer: true,
		timeout: 120000,
	},
});
