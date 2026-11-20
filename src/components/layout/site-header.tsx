import { Search } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CATEGORIES } from "@/components/layout/categories";
import LanguageSwitcher from "@/components/layout/language-switcher";
import MobileMenu from "@/components/layout/mobile-menu";
import ThemeToggle from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";

export default async function SiteHeader() {
	const t = await getTranslations("header");
	const tc = await getTranslations("categories");

	return (
		<header className="border-b border-border bg-bg">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
				<Link
					aria-label={t("home")}
					className="flex shrink-0 items-center outline-none focus-visible:border-blue-500"
					href="/"
				>
					<Image
						alt="Toolify"
						className="h-6 w-auto brightness-0 sm:h-7 dark:brightness-100"
						height={57}
						priority
						src="/assets/wordmark-white-700.png"
						width={200}
					/>
				</Link>
				<nav
					aria-label={t("categoriesNav")}
					className="hidden items-center gap-5 lg:flex"
				>
					{CATEGORIES.map((category) => (
						<Link
							className="text-small text-text-2 outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href={category.href}
							key={category.href}
						>
							{tc(category.key)}
						</Link>
					))}
				</nav>
				<div className="ms-auto flex items-center gap-1">
					<Link
						aria-label={t("search")}
						className="inline-flex size-11 items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
						href="/#search"
					>
						<Search aria-hidden="true" className="size-5" />
					</Link>
					<ThemeToggle />
					<LanguageSwitcher id="site-language" />
					<MobileMenu />
				</div>
			</div>
		</header>
	);
}
