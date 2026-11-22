import { LOCALES } from "./locales";
import { TOOLS } from "./tools";

// pages where analytics must never fire, currently the mnemonic
// pages only. the analytics loader reads this list before firing
// anything, and the tool shell exposes it as a data attribute.
const ANALYTICS_DISABLED = new Set(["mnemonic-generator"]);

const TOOL_SLUGS = new Set(TOOLS.map((tool) => tool.slug));
const LOCALE_CODES = new Set(LOCALES.map((locale) => locale.code));

export function isAnalyticsDisabled(slug: string): boolean {
	return ANALYTICS_DISABLED.has(slug);
}

function segmentsOf(pathname: string): string[] {
	return pathname.split("/").filter(Boolean);
}

// next-intl hands back paths without the locale prefix, but a raw
// browser path can still carry one. drop it before matching tools.
export function toolSlugFromPath(pathname: string): string | null {
	const segments = segmentsOf(pathname);
	const first = segments[0];
	if (!first) {
		return null;
	}
	const rest = LOCALE_CODES.has(first as (typeof LOCALES)[number]["code"])
		? segments.slice(1)
		: segments;
	if (rest.length !== 1) {
		return null;
	}
	const slug = rest[0];
	return slug && TOOL_SLUGS.has(slug) ? slug : null;
}

export function localeFromPath(pathname: string): string {
	const first = segmentsOf(pathname)[0];
	return first && LOCALE_CODES.has(first as (typeof LOCALES)[number]["code"])
		? first
		: "en";
}
