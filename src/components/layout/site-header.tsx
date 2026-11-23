import { Heart, Search } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CATEGORIES } from "@/components/layout/categories";
import CategoryNav from "@/components/layout/category-nav";
import LanguageSwitcher from "@/components/layout/language-switcher";
import MobileMenu from "@/components/layout/mobile-menu";
import ThemeToggle from "@/components/layout/theme-toggle";
import { Link } from "@/i18n/navigation";
import { resolveMenuTools } from "@/lib/menu";

export default async function SiteHeader() {
	const t = await getTranslations("header");
	const tc = await getTranslations("categories");
	const tools = await resolveMenuTools();
	const categories = CATEGORIES.map((category) => ({
		key: category.key,
		label: tc(category.key),
		href: category.href,
		tools: tools.filter((tool) => tool.category === category.key),
	}));

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
						className="size-8 w-auto sm:hidden"
						height={1080}
						priority
						src="/assets/logo-blue-square-1080.png"
						width={1080}
					/>
					<Image
						alt="Toolify"
						className="hidden h-7 w-auto brightness-0 sm:block dark:brightness-100"
						height={57}
						priority
						src="/assets/wordmark-white-700.png"
						width={200}
					/>
				</Link>
				<CategoryNav items={categories} label={t("categoriesNav")} />
				<div className="ms-auto flex items-center gap-1">
					<Link
						aria-label={t("search")}
						className="inline-flex size-11 items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
						href="/#search"
					>
						<Search aria-hidden="true" className="size-5" />
					</Link>
					<Link
						aria-label={t("support")}
						className="inline-flex h-11 items-center gap-1.5 px-2 text-small text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
						href="/support"
					>
						<Heart aria-hidden="true" className="size-5" />
						<span className="hidden sm:inline">{t("tip")}</span>
					</Link>
					<ThemeToggle />
					<LanguageSwitcher id="site-language" />
					<MobileMenu categories={categories} />
				</div>
			</div>
		</header>
	);
}