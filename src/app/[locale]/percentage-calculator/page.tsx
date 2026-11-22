import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import PercentageCalculatorTool from "@/components/tools/percentage-calculator-tool";
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
		namespace: "tools.percentage-calculator",
	});
	return pageMetadata({
		locale,
		path: "/percentage-calculator",
		title: t("title"),
		description: t("description"),
	});
}

export default async function PercentageCalculatorPage() {
	const t = await getTranslations("tools.percentage-calculator");
	return (
		<ToolShell
			category="finance"
			categoryHref={categoryHref("finance")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="percentage-calculator"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<PercentageCalculatorTool />
		</ToolShell>
	);
}
