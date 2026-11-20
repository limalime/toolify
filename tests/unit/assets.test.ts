import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// brand files copied from the prepared assets folder
const assets = [
	"public/assets/logo-blue-square-1080.png",
	"public/assets/logo-mark-transparent-1536.png",
	"public/assets/wordmark-700.png",
	"public/assets/wordmark-white-700.png",
	"public/assets/fonts/CalSans.ttf",
];

describe("brand assets", () => {
	for (const file of assets) {
		it(`ships ${file}`, () => {
			const path = join(process.cwd(), file);
			expect(existsSync(path)).toBe(true);
			expect(statSync(path).size).toBeGreaterThan(0);
		});
	}
});
