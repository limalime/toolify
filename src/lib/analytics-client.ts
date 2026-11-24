import {
	isAnalyticsDisabled,
	localeFromPath,
	toolSlugFromPath,
} from "./analytics";

// basic consent mode. nothing touches google or microsoft until a
// visitor accepts, and mnemonic pages never load either script.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";

type Decision = "granted" | "denied";

const DENIED = {
	ad_storage: "denied",
	ad_user_data: "denied",
	ad_personalization: "denied",
	analytics_storage: "denied",
} as const;

const GRANTED = {
	ad_storage: "granted",
	ad_user_data: "granted",
	ad_personalization: "granted",
	analytics_storage: "granted",
} as const;

type ClarityQueue = ((...args: unknown[]) => void) & { q?: unknown[] };

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
		clarity?: ClarityQueue;
	}
}

let decision: Decision | null = null;
let defaultsSet = false;
let tagsLoaded = false;
let clarityLoaded = false;
let clarityStopped = false;
let routeDisabled = false;
let settled = false;
// gtag sends its own page_view for the page the tag boots on. that hit is
// the landing page view, so the client counts only the pages after it.
let bootViewPending = false;
let lastViewed: string | null = null;
const completed = new Set<string>();
const pending = new Map<string, string>();

function ensureGtag() {
	if (typeof window === "undefined") {
		return;
	}
	window.dataLayer = window.dataLayer ?? [];
	if (!window.gtag) {
		// gtag.js drains the legacy arguments object only. a plain array
		// is accepted by the queue and then silently dropped.
		window.gtag = function gtag() {
			window.dataLayer?.push(arguments);
		};
	}
}

function ensureClarity() {
	if (typeof window === "undefined" || window.clarity) {
		return;
	}
	const queue: unknown[] = [];
	const stub = (...args: unknown[]) => {
		queue.push(args);
	};
	stub.q = queue;
	window.clarity = stub;
}

function injectScript(id: string, src: string) {
	if (document.getElementById(id)) {
		return;
	}
	const script = document.createElement("script");
	script.async = true;
	script.id = id;
	script.src = src;
	document.head.appendChild(script);
}

function currentRouteDisabled(): boolean {
	const slug = toolSlugFromPath(window.location.pathname);
	return slug ? isAnalyticsDisabled(slug) : false;
}

function loadTags() {
	if (
		typeof window === "undefined" ||
		routeDisabled ||
		currentRouteDisabled() ||
		decision !== "granted"
	) {
		return;
	}
	if (!tagsLoaded) {
		tagsLoaded = true;
		ensureGtag();
		if (GA_ID) {
			injectScript(
				"toolify-ga4",
				`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`,
			);
			window.gtag?.("js", new Date());
			// the tag sends one page_view for the page it boots on and no
			// config flag suppresses that hit. let it own the hard load and
			// have the client count only the hops after it, so every page
			// is measured exactly once.
			window.gtag?.("config", GA_ID);
			bootViewPending = true;
		}
		if (CLARITY_ID) {
			ensureClarity();
			window.clarity?.("consentv2", {
				ad_Storage: "granted",
				analytics_Storage: "granted",
			});
			injectScript(
				"toolify-clarity",
				`https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_ID)}`,
			);
			clarityLoaded = true;
		}
	}
	// a client side hop out of a mnemonic page must not leave clarity
	// asleep for the rest of the session.
	if (clarityLoaded && clarityStopped) {
		window.clarity?.("consentv2", {
			ad_Storage: "granted",
			analytics_Storage: "granted",
		});
		window.clarity?.("start");
		clarityStopped = false;
	}
}

export function applyConsent(next: Decision) {
	decision = next;
	if (typeof window === "undefined") {
		return;
	}
	ensureGtag();
	if (!defaultsSet) {
		window.gtag?.("consent", "default", DENIED);
		defaultsSet = true;
	}
	window.gtag?.("consent", "update", next === "granted" ? GRANTED : DENIED);
	settled = true;
	if (next === "granted") {
		loadTags();
		return;
	}
	pending.clear();
	if (clarityLoaded) {
		window.clarity?.("consentv2", {
			ad_Storage: "denied",
			analytics_Storage: "denied",
		});
		window.clarity?.("stop");
		clarityStopped = true;
	}
}

// called on every route change before page tracking so a mnemonic
// path can never piggyback on tags already loaded for another page.
export function syncAnalyticsRoute(pathname: string) {
	const slug = toolSlugFromPath(pathname);
	routeDisabled = slug ? isAnalyticsDisabled(slug) : false;
	if (typeof window === "undefined") {
		return;
	}
	if (routeDisabled) {
		// analytics is off here, so the next allowed page is a fresh view
		// even if it is the page the visitor came from.
		lastViewed = null;
		if (clarityLoaded) {
			window.clarity?.("stop");
			clarityStopped = true;
		}
		return;
	}
	loadTags();
}

function canTrack(): boolean {
	return (
		typeof window !== "undefined" &&
		decision === "granted" &&
		tagsLoaded &&
		!routeDisabled
	);
}

export function trackPageView(pathname: string) {
	if (!canTrack()) {
		return;
	}
	const locale = localeFromPath(pathname);
	// the tag already reported the page it booted on. a view for that same
	// page here would count the landing page twice.
	const isBootPage = bootViewPending && lastViewed === null;
	if (isBootPage) {
		bootViewPending = false;
	} else if (lastViewed !== pathname) {
		window.gtag?.("event", "page_view", {
			page_language: locale,
			page_location: window.location.href,
			page_path: pathname,
			page_title: document.title,
		});
	}
	lastViewed = pathname;
	const slug = toolSlugFromPath(pathname);
	if (slug && !isAnalyticsDisabled(slug)) {
		window.gtag?.("event", "tool_open", {
			page_language: locale,
			tool: slug,
		});
	}
	// a result may already be on screen from the first paint. report it
	// after the page view so the order reads open then complete.
	flushPending();
}

export function trackToolComplete(slug?: string) {
	const tool = slug ?? toolSlugFromPath(window.location.pathname);
	if (!tool || isAnalyticsDisabled(tool)) {
		return;
	}
	if (canTrack()) {
		sendComplete(tool);
		return;
	}
	// child effects run before the consent effect on first paint, so a
	// result that is already on screen waits for the decision.
	if (!settled) {
		pending.set(tool, localeFromPath(window.location.pathname));
	}
}

function sendComplete(tool: string, locale?: string) {
	if (completed.has(tool)) {
		return;
	}
	completed.add(tool);
	window.gtag?.("event", "tool_complete", {
		page_language: locale ?? localeFromPath(window.location.pathname),
		tool,
	});
}

function flushPending() {
	for (const [tool, locale] of pending) {
		sendComplete(tool, locale);
	}
	pending.clear();
}
