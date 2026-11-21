import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import PngToSvgTool from "@/components/tools/png-to-svg-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.png-to-svg" });
	return pageMetadata({
		locale,
		path: "/png-to-svg",
		title: t("title"),
		description: t("description"),
	});
}

export default async function PngToSvgPage() {
	const t = await getTranslations("tools.png-to-svg");
	return (
		<ToolShell
			category="gambar"
			categoryHref={categoryHref("gambar")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="png-to-svg"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<PngToSvgTool />
		</ToolShell>
	);
}
