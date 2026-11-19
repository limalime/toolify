import { LOCALES, type LocaleCode, localizedPath } from "./locales";

export const SITE_URL = "https://toolify.bond";
export const SITE_NAME = "Toolify";

export function absoluteUrl(path: string): string {
	return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}

// every locale version of one path, plus x-default at english.
export function hreflangLinks(path: string): Record<string, string> {
	const links: Record<string, string> = {};
	for (const locale of LOCALES) {
		links[locale.code] = absoluteUrl(
			localizedPath(path, locale.code as LocaleCode),
		);
	}
	links["x-default"] = absoluteUrl(path);
	return links;
}
