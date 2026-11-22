"use client";

import { useTranslations } from "next-intl";
import SmoothButton from "@/components/smoothui/smooth-button";
import { Link } from "@/i18n/navigation";

export default function ConsentBanner({
	onAccept,
	onDecline,
}: {
	onAccept: () => void;
	onDecline: () => void;
}) {
	const t = useTranslations("consent");

	return (
		<aside
			aria-label={t("title")}
			className="fixed inset-x-3 bottom-3 z-50 mx-auto flex w-auto max-w-3xl animate-fade-in flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-modal motion-reduce:animate-none md:flex-row md:items-center md:gap-6 md:p-5"
			data-testid="consent-banner"
		>
			<div className="flex min-w-0 flex-col gap-1">
				<p className="font-display text-h3">{t("title")}</p>
				<p className="text-small text-text-2">{t("body")}</p>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
				<SmoothButton onClick={onAccept} size="sm">
					{t("accept")}
				</SmoothButton>
				<SmoothButton onClick={onDecline} size="sm" variant="secondary">
					{t("decline")}
				</SmoothButton>
				<Link
					className="text-small text-text-2 underline underline-offset-4 outline-none hover:text-text focus-visible:text-blue-500"
					href="/privacy"
				>
					{t("privacy")}
				</Link>
			</div>
		</aside>
	);
}
