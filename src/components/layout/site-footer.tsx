import Image from "next/image";
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
	const year = new Date().getFullYear();

	return (
		<footer className="relative overflow-hidden border-t border-border bg-bg">
			<div
				aria-hidden="true"
				className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent"
			/>
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-10 pb-6">
				<div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
					<nav
						aria-label={t("legal")}
						className="flex flex-wrap gap-x-6 gap-y-2"
					>
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
				</div>
				<div className="relative">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 bg-[radial-gradient(ellipse_60%_100%_at_50%_100%,rgba(27,86,253,0.22),transparent_70%)]"
					/>
					<Image
						alt="Toolify"
						className="relative h-auto w-full brightness-0 dark:brightness-100"
						height={200}
						src="/assets/wordmark-white-700.png"
						width={700}
					/>
				</div>
				<p className="text-caption text-text-3">© {year} Toolify</p>
			</div>
		</footer>
	);
}
