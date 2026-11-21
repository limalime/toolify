import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import AsciiFontsTool from "@/components/tools/ascii-fonts-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.ascii-fonts" });
	return pageMetadata({
		locale,
		path: "/ascii-fonts",
		title: t("title"),
		description: t("description"),
	});
}

export default async function AsciiFontsPage() {
	const t = await getTranslations("tools.ascii-fonts");
	return (
		<ToolShell
			category="text"
			categoryHref={categoryHref("text")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="ascii-fonts"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<AsciiFontsTool />
		</ToolShell>
	);
}
