import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import TrimAudioTool from "@/components/tools/trim-audio-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.trim-audio" });
	return pageMetadata({
		locale,
		path: "/trim-audio",
		title: t("title"),
		description: t("description"),
	});
}

export default async function TrimAudioPage() {
	const t = await getTranslations("tools.trim-audio");
	return (
		<ToolShell
			category="audio"
			categoryHref={categoryHref("audio")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="trim-audio"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<TrimAudioTool />
		</ToolShell>
	);
}
