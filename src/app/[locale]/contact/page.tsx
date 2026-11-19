import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/legal/contact-form";
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
	const t = await getTranslations({ locale, namespace: "contact" });
	return pageMetadata({
		locale,
		path: "/contact",
		title: t("title"),
		description: t("metaDescription"),
	});
}

export default async function ContactPage() {
	const t = await getTranslations("contact");
	return (
		<LegalPage h1={t("h1")} lead={t("lead")}>
			<ContactForm />
		</LegalPage>
	);
}
