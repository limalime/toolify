import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import CurrencyConverterTool from "@/components/tools/currency-converter-tool";
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
	const t = await getTranslations({
		locale,
		namespace: "tools.currency-converter",
	});
	return pageMetadata({
		locale,
		path: "/currency-converter",
		title: t("title"),
		description: t("description"),
	});
}

export default async function CurrencyConverterPage() {
	const t = await getTranslations("tools.currency-converter");
	return (
		<ToolShell
			category="finance"
			categoryHref={categoryHref("finance")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="currency-converter"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<CurrencyConverterTool />
		</ToolShell>
	);
}
