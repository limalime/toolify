import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("geo endpoint", () => {
	it("reads the cloudflare country header", async () => {
		const response = await GET(
			new Request("http://localhost/api/geo", {
				headers: { "cf-ipcountry": "de" },
			}),
		);
		expect(await response.json()).toEqual({ country: "DE" });
	});

	it("answers null when the header is absent", async () => {
		const response = await GET(new Request("http://localhost/api/geo"));
		expect(await response.json()).toEqual({ country: null });
	});

	it("is never cached", async () => {
		const response = await GET(new Request("http://localhost/api/geo"));
		expect(response.headers.get("cache-control")).toContain("no-store");
	});
});
