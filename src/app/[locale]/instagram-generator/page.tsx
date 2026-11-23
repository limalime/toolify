import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import InstagramGeneratorTool from "@/components/tools/instagram-generator-tool";
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
	const t = await getTranslations({ locale, namespace: "tools.instagram-generator" });
	return pageMetadata({
		locale,
		path: "/instagram-generator",
		title: t("title"),
		description: t("description"),
	});
}

export default async function Page() {
	const t = await getTranslations("tools.instagram-generator");
	return (
		<ToolShell
			category="gambar"
			categoryHref={categoryHref("gambar")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="instagram-generator"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<InstagramGeneratorTool />
		</ToolShell>
	);
}
