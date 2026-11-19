// the seven v1 locales. english sits at the root path, the rest are prefixed.
export const LOCALES = [
	{ code: "en", dir: "ltr", name: "English" },
	{ code: "id", dir: "ltr", name: "Indonesia" },
	{ code: "es", dir: "ltr", name: "Español" },
	{ code: "ja", dir: "ltr", name: "日本語" },
	{ code: "zh", dir: "ltr", name: "中文" },
	{ code: "fr", dir: "ltr", name: "Français" },
	{ code: "ar", dir: "rtl", name: "العربية" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const DEFAULT_LOCALE: LocaleCode = "en";

const PREFIXED = ["id", "es", "ja", "zh", "fr", "ar"] as const;

// same page in another locale: (/png-to-jpg, id) -> /id/png-to-jpg
export function localizedPath(pathname: string, locale: LocaleCode): string {
	const pattern = new RegExp(`^/(${PREFIXED.join("|")})(?=/|$)`);
	const stripped = pathname.replace(pattern, "") || "/";
	if (locale === DEFAULT_LOCALE) {
		return stripped;
	}
	return stripped === "/" ? `/${locale}` : `/${locale}${stripped}`;
}
