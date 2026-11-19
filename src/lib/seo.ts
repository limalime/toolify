import type { Metadata } from "next";
import type { LocaleCode } from "./locales";
import { localizedPath } from "./locales";
import { absoluteUrl, hreflangLinks, SITE_NAME, SITE_URL } from "./site";

// one metadata shape for every page. pass the bare title without any
// site suffix, the layout template appends it. pass an absolute title
// only when the title already carries the site name, like the landing.
export function pageMetadata({
	locale,
	path,
	title,
	description,
	absoluteTitle = false,
}: {
	locale: LocaleCode;
	path: string;
	title: string;
	description: string;
	absoluteTitle?: boolean;
}): Metadata {
	const url = absoluteUrl(localizedPath(path, locale));
	const image = {
		url: `${SITE_URL}/assets/logo-blue-square-1080.png`,
		width: 1080,
		height: 1080,
		alt: SITE_NAME,
	};
	return {
		title: absoluteTitle ? { absolute: title } : title,
		description,
		alternates: {
			canonical: url,
			languages: hreflangLinks(path),
		},
		openGraph: {
			title,
			description,
			url,
			siteName: SITE_NAME,
			locale,
			type: "website",
			images: [image],
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [image],
		},
	};
}
