import { LOCALES, type LocaleCode, localizedPath } from "./locales";
import { absoluteUrl, hreflangLinks, SITE_URL } from "./site";
import { allSitePaths } from "./site-routes";

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function buildSitemapIndex(
	today: string = new Date().toISOString(),
): string {
	const entries = LOCALES.map(
		(locale) =>
			`  <sitemap><loc>${SITE_URL}/sitemap/${locale.code}.xml</loc><lastmod>${today}</lastmod></sitemap>`,
	).join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>`;
}

export function buildLocaleSitemap(
	locale: LocaleCode,
	today: string = new Date().toISOString(),
): string {
	const urls = allSitePaths()
		.map((path) => {
			const loc = escapeXml(absoluteUrl(localizedPath(path, locale)));
			const alternates = Object.entries(hreflangLinks(path))
				.map(
					([hreflang, href]) =>
						`<xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(href)}"/>`,
				)
				.join("");
			const changefreq = path === "/" ? "daily" : "monthly";
			const priority = path === "/" ? "1" : "0.8";
			return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${alternates}</url>`;
		})
		.join("\n");
	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`;
}
