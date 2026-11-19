import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import LegalPage, { LegalSection } from "@/components/legal/legal-page";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale } = await params;
	if (!hasLocale(routing.locales, locale)) {
		notFound();
	}
	const t = await getTranslations({ locale, namespace: "terms" });
	return pageMetadata({
		locale,
		path: "/terms",
		title: t("title"),
		description: t("metaDescription"),
	});
}

interface TermsSection {
	h: string;
	body: string[];
}

export default async function TermsPage() {
	const t = await getTranslations("terms");
	const sections = t.raw("sections") as TermsSection[];
	return (
		<LegalPage h1={t("h1")} lead={t("lead")}>
			{sections.map((section) => (
				<LegalSection body={section.body} h={section.h} key={section.h} />
			))}
		</LegalPage>
	);
}
