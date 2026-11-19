import type { Metadata } from "next";
import { getMessages, getTranslations } from "next-intl/server";
import ToolMenu, { type MenuTool } from "@/components/landing/tool-menu";
import { TOOLS } from "@/lib/tools";

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("landing");
	return {
		title: t("metaTitle"),
		description: t("metaDescription"),
	};
}

type ToolMessages = Record<string, { name: string; tagline: string }>;

export default async function LandingPage() {
	const t = await getTranslations("landing");
	const tc = await getTranslations("categories");
	const messages = await getMessages();
	const toolMessages = ((messages as Record<string, unknown>).tools ??
		{}) as ToolMessages;

	const tools: MenuTool[] = TOOLS.map((tool) => ({
		...tool,
		name: toolMessages[tool.slug]?.name ?? tool.slug,
		tagline: toolMessages[tool.slug]?.tagline ?? "",
		categoryLabel: tc(tool.category),
	}));

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16">
			<section className="flex flex-col gap-3">
				<h1 className="font-display text-display">{t("heroTitle")}</h1>
				<p className="max-w-prose text-body text-text-2">{t("heroSub")}</p>
			</section>
			<ToolMenu
				copy={{
					emptyClear: t("emptyClear"),
					emptyTitle: t("emptyTitle"),
					searchLabel: t("searchLabel"),
					searchPlaceholder: t("searchPlaceholder"),
				}}
				tools={tools}
			/>
			<div className="grid gap-4 md:grid-cols-3">
				<div className="flex flex-col gap-1">
					<h2 className="font-display text-h3">{t("why1title")}</h2>
					<p className="text-small text-text-2">{t("why1line")}</p>
				</div>
				<div className="flex flex-col gap-1">
					<h2 className="font-display text-h3">{t("why2title")}</h2>
					<p className="text-small text-text-2">{t("why2line")}</p>
				</div>
				<div className="flex flex-col gap-1">
					<h2 className="font-display text-h3">{t("why3title")}</h2>
					<p className="text-small text-text-2">{t("why3line")}</p>
				</div>
			</div>
		</div>
	);
}
