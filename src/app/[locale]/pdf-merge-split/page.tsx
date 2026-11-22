import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { categoryHref } from "@/components/layout/categories";
import ToolShell, {
	type ToolFaq,
	type ToolStep,
} from "@/components/tool/tool-shell";
import PdfTool from "@/components/tools/pdf-merge-split-tool";
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
		namespace: "tools.pdf-merge-split",
	});
	return pageMetadata({
		locale,
		path: "/pdf-merge-split",
		title: t("title"),
		description: t("description"),
	});
}

export default async function PdfMergeSplitPage() {
	const t = await getTranslations("tools.pdf-merge-split");
	return (
		<ToolShell
			category="pdfUtilities"
			categoryHref={categoryHref("pdfUtilities")}
			description={t("description")}
			faqs={t.raw("faqs") as ToolFaq[]}
			h1={t("h1")}
			slug="pdf-merge-split"
			steps={t.raw("steps") as ToolStep[]}
			sub={t("sub")}
			toolName={t("name")}
		>
			<PdfTool />
		</ToolShell>
	);
}
