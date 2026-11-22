"use client";

import { useTranslations } from "next-intl";
import SmoothButton from "@/components/smoothui/smooth-button";
import { openConsentSettings } from "@/lib/consent";

export default function ConsentSettings() {
	const t = useTranslations("consent");

	return (
		<SmoothButton onClick={openConsentSettings} size="sm" variant="secondary">
			{t("settings")}
		</SmoothButton>
	);
}
