import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import VideoToGifTool from "@/components/tools/video-to-gif-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.video-to-gif" });
	return pageMetadata({
		locale,
		path: "/video-to-gif",
		title: t("title"),
		description: t("description"),
	});
}

export default async function VideoToGifPage() {
	const t = await getTranslations("tools.video-to-gif");
	return (
		<ToolShell
			category="video"
			categoryHref={categoryHref("video")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="video-to-gif"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<VideoToGifTool />
		</ToolShell>
	);
}
