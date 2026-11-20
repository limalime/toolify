"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CATEGORIES } from "@/components/layout/categories";
import LanguageSwitcher from "@/components/layout/language-switcher";
import { Link } from "@/i18n/navigation";

// hamburger plus slide-over menu for small screens. hidden on desktop.
// the trigger icon morphs into a close cross while the menu is open.
export default function MobileMenu() {
	const [open, setOpen] = useState(false);
	const t = useTranslations("header");
	const tc = useTranslations("categories");

	return (
		<Dialog.Root onOpenChange={setOpen}>
			<Dialog.Trigger
				render={
					<button
						aria-expanded={open}
						aria-label={t("openMenu")}
						className="inline-flex size-11 cursor-pointer items-center justify-center text-text outline-none hover:text-blue-500 focus-visible:border-blue-500 lg:hidden"
						type="button"
					>
						<span aria-hidden="true" className="relative block size-5">
							<span
								className={`absolute start-0 h-0.5 w-5 bg-current transition-all duration-200 ease-out motion-reduce:transition-none ${
									open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-[4px]"
								}`}
							/>
							<span
								className={`absolute start-0 top-1/2 h-0.5 w-5 -translate-y-1/2 bg-current transition-all duration-200 ease-out motion-reduce:transition-none ${
									open ? "opacity-0" : "opacity-100"
								}`}
							/>
							<span
								className={`absolute start-0 h-0.5 w-5 bg-current transition-all duration-200 ease-out motion-reduce:transition-none ${
									open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-[4px]"
								}`}
							/>
						</span>
					</button>
				}
			/>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
				<Dialog.Popup className="fixed inset-y-0 start-0 z-50 flex w-80 max-w-[85vw] flex-col gap-6 overflow-y-auto rounded-e-lg border-e border-border bg-surface p-5 transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full motion-reduce:transition-none rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full">
					<Dialog.Title className="sr-only">{t("menu")}</Dialog.Title>
					<div className="flex items-center justify-between">
						<Image
							alt="Toolify"
							className="brightness-0 dark:brightness-100"
							height={28}
							src="/assets/wordmark-white-700.png"
							width={98}
						/>
						<Dialog.Close
							render={
								<button
									aria-label={t("closeMenu")}
									className="inline-flex size-11 cursor-pointer items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
									type="button"
								>
									<X aria-hidden="true" className="size-5" />
								</button>
							}
						/>
					</div>
					<nav aria-label={t("categoriesNav")} className="flex flex-col">
						{CATEGORIES.map((category) => (
							<Dialog.Close
								key={category.href}
								render={
									<Link
										className="flex min-h-11 items-center border-b border-border text-body text-text outline-none hover:text-blue-500 focus-visible:text-blue-500"
										href={category.href}
									>
										{tc(category.key)}
									</Link>
								}
							/>
						))}
					</nav>
					<div className="mt-auto">
						<LanguageSwitcher id="mobile-language" />
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
