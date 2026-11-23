import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import SupportOptions from "@/components/support/support-options";
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
	const t = await getTranslations({ locale, namespace: "support" });
	return pageMetadata({
		locale,
		path: "/support",
		title: t("title"),
		description: t("metaDescription"),
	});
}

export default async function SupportPage() {
	const t = await getTranslations("support");

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:py-16">
			<section className="flex flex-col items-center gap-5 text-center">
				<div className="relative flex size-36 items-center justify-center rounded-lg border border-border bg-surface md:size-44">
					<Image
						alt=""
						aria-hidden="true"
						className="size-28 w-auto md:size-36 dark:hidden"
						height={1000}
						priority
						src="/assets/donate-box.svg"
						width={1000}
					/>
					<Image
						alt=""
						aria-hidden="true"
						className="hidden size-28 w-auto md:size-36 dark:block"
						height={1000}
						priority
						src="/assets/donate-box-dark.svg"
						width={1000}
					/>
				</div>
				<div className="flex flex-col gap-3">
					<h1>{t("h1")}</h1>
					<p className="max-w-xl text-body text-text-2">{t("sub")}</p>
				</div>
			</section>
			<SupportOptions />
		</div>
	);
}