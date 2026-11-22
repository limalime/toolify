"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ConsentBanner from "@/components/analytics/consent-banner";
import {
	applyConsent,
	syncAnalyticsRoute,
	trackPageView,
} from "@/lib/analytics-client";
import {
	CONSENT_OPEN_EVENT,
	type ConsentDecision,
	isEeaCountry,
	readConsent,
	writeConsent,
} from "@/lib/consent";

// reads the stored choice, or asks once for eea visitors. unknown
// countries wait for a click, never assume consent.
export default function ConsentProvider() {
	const pathname = usePathname();
	const [decision, setDecision] = useState<ConsentDecision | null>(null);
	const [bannerOpen, setBannerOpen] = useState(false);

	useEffect(() => {
		const stored = readConsent();
		if (stored) {
			setDecision(stored);
			return;
		}
		let cancelled = false;
		const controller = new AbortController();
		fetch("/api/geo", {
			cache: "no-store",
			headers: { Accept: "application/json" },
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) {
					return null;
				}
				const data = (await response.json()) as { country?: unknown };
				return typeof data.country === "string" ? data.country : null;
			})
			.then((country) => {
				if (cancelled) {
					return;
				}
				if (isEeaCountry(country)) {
					applyConsent("denied");
					setBannerOpen(true);
					return;
				}
				// outside the consent regions the banner would be noise,
				// analytics may start without storing a choice.
				setDecision("granted");
			})
			.catch(() => {
				if (!cancelled) {
					applyConsent("denied");
					setBannerOpen(true);
				}
			});
		return () => {
			cancelled = true;
			controller.abort();
		};
	}, []);

	useEffect(() => {
		const reopen = () => {
			setDecision(null);
			setBannerOpen(true);
			applyConsent("denied");
		};
		window.addEventListener(CONSENT_OPEN_EVENT, reopen);
		return () => window.removeEventListener(CONSENT_OPEN_EVENT, reopen);
	}, []);

	useEffect(() => {
		if (!decision) {
			return;
		}
		syncAnalyticsRoute(pathname);
		applyConsent(decision);
		trackPageView(pathname);
	}, [decision, pathname]);

	const choose = (next: ConsentDecision) => {
		writeConsent(next);
		setDecision(next);
		setBannerOpen(false);
	};

	return bannerOpen ? (
		<ConsentBanner
			onAccept={() => choose("granted")}
			onDecline={() => choose("denied")}
		/>
	) : null;
}
