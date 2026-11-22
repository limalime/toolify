import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import AdSlot from "@/components/ads/ad-slot";
import ToolMenu from "@/components/landing/tool-menu";
import { routing } from "@/i18n/routing";
import { organizationJsonLd, toJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { resolveMenuTools } from "@/lib/menu";
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
	const t = await getTranslations({ locale, namespace: "landing" });
	return pageMetadata({
		locale,
		path: "/",
		title: t("metaTitle"),
		description: t("metaDescription"),
		absoluteTitle: true,
	});
}

export default async function LandingPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const t = await getTranslations("landing");
	const tools = await resolveMenuTools();
	const website = websiteJsonLd({ description: t("metaDescription"), locale });
	const organization = organizationJsonLd();

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16">
			<script type="application/ld+json">{toJsonLd(website)}</script>
			<script type="application/ld+json">{toJsonLd(organization)}</script>
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
			<AdSlot name="home_below_tools" />
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
			<AdSlot name="home_above_footer" />
		</div>
	);
}
