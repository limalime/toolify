import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import type { LocaleCode } from "@/lib/locales";
import { LOCALES } from "@/lib/locales";
import { buildLocaleSitemap } from "@/lib/sitemap";

export async function generateStaticParams() {
	return LOCALES.map((locale) => ({ locale: `${locale.code}.xml` }));
}

// one sitemap per locale, every url carrying its alternates.
// the locale param arrives with its .xml suffix, strip it first.
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ locale: string }> },
) {
	const { locale } = await params;
	const code = locale.replace(/\.xml$/, "");
	if (!hasLocale(routing.locales, code)) {
		notFound();
	}
	return new Response(buildLocaleSitemap(code as LocaleCode), {
		headers: { "Content-Type": "application/xml" },
	});
}
