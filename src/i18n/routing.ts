import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/locales";

export const routing = defineRouting({
	locales: LOCALES.map((locale) => locale.code),
	defaultLocale: DEFAULT_LOCALE,
	localePrefix: "as-needed",
	// detection reads Accept-Language on every bare path. no cookie,
	// so explicit switcher links always win over a previous visit.
	localeCookie: false,
});
