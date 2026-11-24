import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function loadClient() {
	vi.resetModules();
	return import("./analytics-client");
}

function entries(): unknown[][] {
	return (window.dataLayer ?? []).map((entry) => entry as unknown[]);
}

function names(): string[] {
	return entries()
		.filter((entry) => entry[0] === "event")
		.map((entry) => String(entry[1]));
}

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
	vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "test-clarity");
	document.head.innerHTML = "";
	window.history.replaceState({}, "", "/");
	delete window.dataLayer;
	delete window.gtag;
	delete window.clarity;
});

afterEach(() => {
	vi.unstubAllEnvs();
	document.head.innerHTML = "";
});

describe("analytics client", () => {
	it("sends nothing before a decision", async () => {
		const client = await loadClient();
		client.trackPageView("/image-converter");
		expect(window.dataLayer).toBeUndefined();
		expect(
			document.querySelector("script[src*='googletagmanager']"),
		).toBeNull();
	});

	it("loads tags and records a tool open after consent", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/image-converter");
		client.applyConsent("granted");
		client.trackPageView("/image-converter");

		expect(
			document.querySelector("script[src*='googletagmanager']"),
		).not.toBeNull();
		expect(document.querySelector("script[src*='clarity.ms']")).not.toBeNull();
		expect(names()).toEqual(["page_view", "tool_open"]);
		const open = entries().find((entry) => entry[1] === "tool_open");
		expect(open?.[2]).toEqual({
			page_language: "en",
			tool: "image-converter",
		});
	});

	it("queues gtag calls in the shape gtag.js drains", async () => {
		const client = await loadClient();
		client.applyConsent("denied");
		const entry = window.dataLayer?.[0];
		// gtag.js reads the legacy arguments object. an array here is
		// accepted by the queue and then silently dropped.
		expect(Array.isArray(entry)).toBe(false);
		expect(Object.prototype.toString.call(entry)).toBe("[object Arguments]");
		expect((entry as unknown[])[0]).toBe("consent");
	});

	it("keeps scripts away when consent is denied", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/image-converter");
		client.applyConsent("denied");
		client.trackPageView("/image-converter");
		expect(
			document.querySelector("script[src*='googletagmanager']"),
		).toBeNull();
		expect(document.querySelector("script[src*='clarity.ms']")).toBeNull();
		expect(names()).toEqual([]);
	});

	it("never loads or records on the mnemonic page", async () => {
		window.history.replaceState({}, "", "/id/mnemonic-generator");
		const client = await loadClient();
		client.syncAnalyticsRoute("/mnemonic-generator");
		client.applyConsent("granted");
		client.trackPageView("/mnemonic-generator");

		expect(
			document.querySelector("script[src*='googletagmanager']"),
		).toBeNull();
		expect(document.querySelector("script[src*='clarity.ms']")).toBeNull();
		expect(names()).toEqual([]);
	});

	it("reports a completion once per tool", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/unit-converter");
		client.applyConsent("granted");
		client.trackToolComplete("unit-converter");
		client.trackToolComplete("unit-converter");
		expect(names()).toEqual(["tool_complete"]);
		expect(
			entries().find((entry) => entry[1] === "tool_complete")?.[2],
		).toEqual({ page_language: "en", tool: "unit-converter" });
	});

	it("holds a first paint completion until after the page view", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/unit-converter");
		client.trackToolComplete("unit-converter");
		expect(names()).toEqual([]);

		client.applyConsent("granted");
		expect(names()).toEqual([]);

		client.trackPageView("/unit-converter");
		expect(names()).toEqual(["page_view", "tool_open", "tool_complete"]);
	});

	it("ignores completion on a mnemonic page", async () => {
		window.history.replaceState({}, "", "/mnemonic-generator");
		const client = await loadClient();
		client.syncAnalyticsRoute("/mnemonic-generator");
		client.applyConsent("granted");
		client.trackToolComplete("mnemonic-generator");
		expect(names()).toEqual([]);
	});
});
