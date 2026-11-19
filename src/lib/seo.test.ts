import { describe, expect, it } from "vitest";
import {
	faqPageJsonLd,
	organizationJsonLd,
	toJsonLd,
	webApplicationJsonLd,
	websiteJsonLd,
} from "./jsonld";
import { pageMetadata } from "./seo";
import { absoluteUrl, hreflangLinks, SITE_URL } from "./site";
import { allSitePaths } from "./site-routes";
import { buildLocaleSitemap, buildSitemapIndex } from "./sitemap";

describe("site urls", () => {
	it("builds absolute urls with a slashless root", () => {
		expect(absoluteUrl("/")).toBe(SITE_URL);
		expect(absoluteUrl("/id/about")).toBe(`${SITE_URL}/id/about`);
	});

	it("links every locale plus x-default", () => {
		const links = hreflangLinks("/about");
		expect(Object.keys(links).sort()).toEqual([
			"ar",
			"en",
			"es",
			"fr",
			"id",
			"ja",
			"x-default",
			"zh",
		]);
		expect(links.en).toBe(`${SITE_URL}/about`);
		expect(links.id).toBe(`${SITE_URL}/id/about`);
		expect(links["x-default"]).toBe(`${SITE_URL}/about`);
	});
});

describe("page metadata", () => {
	it("carries title, description, canonical, and social tags", () => {
		const meta = pageMetadata({
			locale: "id",
			path: "/about",
			title: "Tentang",
			description: "Tentang Toolify.",
		});
		expect(meta.title).toBe("Tentang");
		expect(meta.description).toBe("Tentang Toolify.");
		const alternates = meta.alternates as {
			canonical: string;
			languages: Record<string, string>;
		};
		expect(alternates.canonical).toBe(`${SITE_URL}/id/about`);
		expect(alternates.languages.en).toBe(`${SITE_URL}/about`);
		const openGraph = meta.openGraph as { url: string; locale: string };
		expect(openGraph.url).toBe(`${SITE_URL}/id/about`);
		expect(openGraph.locale).toBe("id");
	});

	it("supports absolute titles that already carry the site name", () => {
		const meta = pageMetadata({
			locale: "en",
			path: "/",
			title: "Toolify: Free Tools",
			description: "Free tools.",
			absoluteTitle: true,
		});
		expect(meta.title).toEqual({ absolute: "Toolify: Free Tools" });
	});
});

describe("jsonld", () => {
	it("serializes safely for script tags", () => {
		expect(toJsonLd({ text: "a < b </script>" })).toBe(
			'{"text":"a \\u003c b \\u003c/script>"}',
		);
		expect(JSON.parse(toJsonLd({ text: "a < b" }))).toEqual({ text: "a < b" });
	});

	it("emits a valid website block", () => {
		const block = websiteJsonLd({ description: "Free tools.", locale: "en" });
		expect(JSON.parse(JSON.stringify(block))["@type"]).toBe("WebSite");
		expect(block.inLanguage).toBe("en");
	});

	it("emits a valid organization block with logo", () => {
		const block = organizationJsonLd();
		expect(JSON.parse(JSON.stringify(block))["@type"]).toBe("Organization");
		expect(block.logo).toContain(SITE_URL);
	});

	it("emits a free web application block", () => {
		const block = webApplicationJsonLd({
			name: "Free PNG to JPG Converter",
			description: "Convert PNG to JPG.",
			url: `${SITE_URL}/png-to-jpg`,
			category: "Image",
		});
		const parsed = JSON.parse(JSON.stringify(block));
		expect(parsed["@type"]).toBe("WebApplication");
		expect(parsed.offers.price).toBe("0");
		expect(parsed.operatingSystem).toBe("Web");
	});

	it("emits a faq block with questions and answers", () => {
		const block = faqPageJsonLd([{ question: "Is it free?", answer: "Yes." }]);
		const parsed = JSON.parse(JSON.stringify(block));
		expect(parsed["@type"]).toBe("FAQPage");
		expect(parsed.mainEntity).toHaveLength(1);
		expect(parsed.mainEntity[0].acceptedAnswer.text).toBe("Yes.");
	});
});

describe("site routes", () => {
	it("lists static pages plus every tool slug", () => {
		const paths = allSitePaths();
		expect(paths).toContain("/");
		for (const path of paths) {
			expect(path.startsWith("/")).toBe(true);
		}
	});
});

describe("sitemap builders", () => {
	it("indexes the seven per-locale sitemaps", () => {
		const xml = buildSitemapIndex("2026-01-01T00:00:00.000Z");
		expect(xml).toContain("<sitemapindex");
		for (const code of ["en", "id", "es", "ja", "zh", "fr", "ar"]) {
			expect(xml).toContain(`<loc>${SITE_URL}/sitemap/${code}.xml</loc>`);
		}
	});

	it("lists every page with alternates per locale", () => {
		const xml = buildLocaleSitemap("id", "2026-01-01T00:00:00.000Z");
		expect(xml).toContain("<urlset");
		expect(xml).toContain("<loc>https://toolify.bond/id</loc>");
		for (const code of [
			"en",
			"id",
			"es",
			"ja",
			"zh",
			"fr",
			"ar",
			"x-default",
		]) {
			expect(xml).toContain(`hreflang="${code}"`);
		}
		expect(xml).not.toContain("/internal/");
	});
});
