import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { hasLocale, IntlErrorCode } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale }) => {
	if (!locale) {
		const paramValue = await rootParams.locale();
		if (hasLocale(routing.locales, paramValue)) {
			locale = paramValue;
		} else {
			notFound();
		}
	}

	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
		// a missing key renders its loud key path, never a silent fallback.
		// the locale parity check fails the build first, so this is a backstop.
		onError(error) {
			if (error.code !== IntlErrorCode.MISSING_MESSAGE) {
				console.error(error);
			}
		},
		getMessageFallback({ namespace, key }) {
			return `${namespace}.${key}`;
		},
	};
});
