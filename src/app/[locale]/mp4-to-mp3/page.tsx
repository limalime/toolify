import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import Mp4ToMp3Tool from "@/components/tools/mp4-to-mp3-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.mp4-to-mp3" });
	return pageMetadata({
		locale,
		path: "/mp4-to-mp3",
		title: t("title"),
		description: t("description"),
	});
}

export default async function Mp4ToMp3Page() {
	const t = await getTranslations("tools.mp4-to-mp3");
	return (
		<ToolShell
			category="video"
			categoryHref={categoryHref("video")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="mp4-to-mp3"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<Mp4ToMp3Tool />
		</ToolShell>
	);
}
