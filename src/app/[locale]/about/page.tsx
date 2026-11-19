import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import LegalPage from "@/components/legal/legal-page";
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
	const t = await getTranslations({ locale, namespace: "about" });
	return pageMetadata({
		locale,
		path: "/about",
		title: t("title"),
		description: t("metaDescription"),
	});
}

export default async function AboutPage() {
	const t = await getTranslations("about");
	const body = t.raw("body") as string[];
	return (
		<LegalPage h1={t("h1")} lead={t("lead")}>
			<div className="flex flex-col gap-4">
				{body.map((paragraph) => (
					<p className="text-body text-text-2" key={paragraph.slice(0, 24)}>
						{paragraph}
					</p>
				))}
			</div>
		</LegalPage>
	);
}
