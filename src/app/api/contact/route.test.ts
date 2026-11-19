import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";

const valid = { name: "Ada", email: "ada@example.com", message: "Hello" };

function post(body: unknown) {
	return POST(
		new Request("http://localhost/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
	);
}

describe("contact endpoint", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.CONTACT_FORM_ACTION;
	});

	it("rejects bad payloads without calling anyone", async () => {
		const send = vi.fn();
		vi.stubGlobal("fetch", send);
		for (const body of [
			{ name: "", email: "ada@example.com", message: "Hi" },
			{ name: "Ada", email: "not-an-email", message: "Hi" },
			{ name: "Ada", email: "ada@example.com", message: "" },
			"not-json{{{",
		]) {
			const response = await post(body);
			expect(response.status).toBe(422);
		}
		expect(send).not.toHaveBeenCalled();
	});

	it("answers unavailable when no endpoint is configured", async () => {
		const send = vi.fn();
		vi.stubGlobal("fetch", send);
		const response = await post(valid);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ ok: false, error: "unavailable" });
		expect(send).not.toHaveBeenCalled();
	});

	it("forwards valid messages to the configured endpoint", async () => {
		process.env.CONTACT_FORM_ACTION = "https://forms.example.com/submit";
		const send = vi.fn(async () => new Response("{}", { status: 200 }));
		vi.stubGlobal("fetch", send);
		const response = await post(valid);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
		expect(send).toHaveBeenCalledWith(
			"https://forms.example.com/submit",
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("reports upstream failures honestly", async () => {
		process.env.CONTACT_FORM_ACTION = "https://forms.example.com/submit";
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("{}", { status: 500 })),
		);
		const failed = await post(valid);
		expect(failed.status).toBe(502);
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("down");
			}),
		);
		const thrown = await post(valid);
		expect(thrown.status).toBe(502);
	});
});
