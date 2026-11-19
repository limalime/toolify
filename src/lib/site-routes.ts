import { TOOLS } from "./tools";

// static pages. the phase that ships a page appends its route here so
// the sitemap, llms.txt, and the seo suite grow with the site.
export const STATIC_ROUTES: string[] = [
	"/",
	"/about",
	"/contact",
	"/privacy",
	"/terms",
];

export function allSitePaths(): string[] {
	return [...STATIC_ROUTES, ...TOOLS.map((tool) => `/${tool.slug}`)];
}
