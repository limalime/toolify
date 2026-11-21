import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import WordCounterTool from "@/components/tools/word-counter-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.word-counter" });
	return pageMetadata({
		locale,
		path: "/word-counter",
		title: t("title"),
		description: t("description"),
	});
}

export default async function WordCounterPage() {
	const t = await getTranslations("tools.word-counter");
	return (
		<ToolShell
			category="text"
			categoryHref={categoryHref("text")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="word-counter"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<WordCounterTool />
		</ToolShell>
	);
}
