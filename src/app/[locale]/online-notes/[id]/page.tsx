import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import SharedNoteView from "@/components/tools/shared-note-view";
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
	const t = await getTranslations({ locale, namespace: "tools.online-notes" });
	const meta = pageMetadata({
		locale,
		path: "/online-notes",
		title: t("options.sharedTitle"),
		description: t("options.sharedDescription"),
	});
	return { ...meta, robots: { index: false, follow: false } };
}

export default function SharedNotePage() {
	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
			<SharedNoteView />
		</div>
	);
}