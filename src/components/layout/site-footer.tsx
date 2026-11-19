import { getTranslations } from "next-intl/server";
import { InlineLocaleList } from "@/components/layout/language-switcher";
import { Link } from "@/i18n/navigation";

const LEGAL = [
	{ href: "/about", key: "about" },
	{ href: "/contact", key: "contact" },
	{ href: "/privacy", key: "privacy" },
	{ href: "/terms", key: "terms" },
] as const;

export default async function SiteFooter() {
	const t = await getTranslations("footer");

	return (
		<footer className="border-t border-border bg-bg">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
				<nav aria-label={t("legal")} className="flex flex-wrap gap-x-6 gap-y-2">
					{LEGAL.map((page) => (
						<Link
							className="text-small text-text-2 outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href={page.href}
							key={page.href}
						>
							{t(page.key)}
						</Link>
					))}
				</nav>
				<nav aria-label={t("languages")}>
					<InlineLocaleList />
				</nav>
				<p className="text-small text-text-3">{t("privacyLine")}</p>
			</div>
		</footer>
	);
}
