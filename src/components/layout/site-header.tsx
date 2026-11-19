import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CATEGORIES } from "@/components/layout/categories";
import LanguageSwitcher from "@/components/layout/language-switcher";
import MobileMenu from "@/components/layout/mobile-menu";

export default function SiteHeader() {
	return (
		<header className="border-b border-border bg-bg">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
				<Link
					aria-label="Toolify home"
					className="flex shrink-0 items-center gap-2 outline-none focus-visible:border-blue-500"
					href="/"
				>
					<Image
						alt="Toolify"
						height={32}
						priority
						src="/assets/logo-blue-square-1080.png"
						width={32}
					/>
					<Image
						alt="Toolify"
						className="hidden h-5 w-auto sm:block"
						height={57}
						priority
						src="/assets/wordmark-white-700.png"
						width={200}
					/>
				</Link>
				<nav
					aria-label="Categories"
					className="hidden items-center gap-5 lg:flex"
				>
					{CATEGORIES.map((category) => (
						<Link
							className="text-small text-text-2 outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href={category.href}
							key={category.href}
						>
							{category.label}
						</Link>
					))}
				</nav>
				<div className="ms-auto flex items-center gap-1">
					<Link
						aria-label="Search tools"
						className="inline-flex size-11 items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
						href="/#search"
					>
						<Search aria-hidden="true" className="size-5" />
					</Link>
					<LanguageSwitcher id="site-language" />
					<MobileMenu />
				</div>
			</div>
		</header>
	);
}
