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
		// the tag reports the page it boots on itself, so the client only
		// adds the tool open here. a manual view would double count.
		expect(names()).toEqual(["tool_open"]);
		const open = entries().find((entry) => entry[1] === "tool_open");
		expect(open?.[2]).toEqual({
			page_language: "en",
			tool: "image-converter",
		});
	});

	it("counts each page once across boot and client navigation", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/image-converter");
		client.applyConsent("granted");
		client.trackPageView("/image-converter");
		// the tag owns the landing page view, so nothing here
		expect(names()).toEqual(["tool_open"]);

		client.syncAnalyticsRoute("/case-converter");
		client.trackPageView("/case-converter");
		expect(names()).toEqual(["tool_open", "page_view", "tool_open"]);
		const view = entries().find(
			(entry) => entry[0] === "event" && entry[1] === "page_view",
		);
		expect(view?.[2]).toMatchObject({
			page_language: "en",
			page_path: "/case-converter",
		});

		// going back is a real view again, the boot page already counted
		client.syncAnalyticsRoute("/image-converter");
		client.trackPageView("/image-converter");
		expect(names().filter((name) => name === "page_view")).toHaveLength(2);
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
		expect(names()).toEqual(["tool_open", "tool_complete"]);
	});

	it("counts again after a mnemonic page interrupts the trail", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/unit-converter");
		client.applyConsent("granted");
		client.trackPageView("/unit-converter");
		client.syncAnalyticsRoute("/mnemonic-generator");
		client.trackPageView("/mnemonic-generator");
		client.syncAnalyticsRoute("/unit-converter");
		client.trackPageView("/unit-converter");
		expect(names().filter((name) => name === "page_view")).toHaveLength(1);
	});

	it("ignores a repeat view for the page already counted", async () => {
		const client = await loadClient();
		client.syncAnalyticsRoute("/unit-converter");
		client.applyConsent("granted");
		client.trackPageView("/unit-converter");
		client.trackPageView("/unit-converter");
		expect(names().filter((name) => name === "page_view")).toHaveLength(0);
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
