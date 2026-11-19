import Link from "next/link";
import { InlineLocaleList } from "@/components/layout/language-switcher";

const LEGAL = [
	{ href: "/about", label: "About" },
	{ href: "/contact", label: "Contact" },
	{ href: "/privacy", label: "Privacy" },
	{ href: "/terms", label: "Terms" },
] as const;

export default function SiteFooter() {
	return (
		<footer className="border-t border-border bg-bg">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
				<nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
					{LEGAL.map((page) => (
						<Link
							className="text-small text-text-2 outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
							href={page.href}
							key={page.href}
						>
							{page.label}
						</Link>
					))}
				</nav>
				<nav aria-label="Languages">
					<InlineLocaleList />
				</nav>
				<p className="text-small text-text-3">
					Files never leave your browser.
				</p>
			</div>
		</footer>
	);
}
