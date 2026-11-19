"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu as MenuIcon, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { CATEGORIES } from "@/components/layout/categories";
import LanguageSwitcher from "@/components/layout/language-switcher";

// hamburger plus slide-over menu for small screens. hidden on desktop.
export default function MobileMenu() {
	const [open, setOpen] = useState(false);

	return (
		<Dialog.Root onOpenChange={setOpen} open={open}>
			<Dialog.Trigger
				render={
					<button
						aria-label="Open menu"
						className="inline-flex size-11 cursor-pointer items-center justify-center text-text outline-none hover:text-blue-500 focus-visible:border-blue-500 lg:hidden"
						type="button"
					>
						<MenuIcon aria-hidden="true" className="size-5" />
					</button>
				}
			/>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
				<Dialog.Popup className="fixed inset-y-0 start-0 z-50 flex w-80 max-w-[85vw] flex-col gap-6 overflow-y-auto border-e border-border bg-surface p-5 transition-transform duration-200 data-ending-style:-translate-x-full data-starting-style:-translate-x-full motion-reduce:transition-none rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full">
					<Dialog.Title className="sr-only">Menu</Dialog.Title>
					<div className="flex items-center justify-between">
						<Image
							alt="Toolify"
							height={32}
							src="/assets/logo-blue-square-1080.png"
							width={32}
						/>
						<Dialog.Close
							render={
								<button
									aria-label="Close menu"
									className="inline-flex size-11 cursor-pointer items-center justify-center text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
									type="button"
								>
									<X aria-hidden="true" className="size-5" />
								</button>
							}
						/>
					</div>
					<nav aria-label="Categories" className="flex flex-col">
						{CATEGORIES.map((category) => (
							<Dialog.Close
								key={category.href}
								render={
									<a
										className="flex min-h-11 items-center border-b border-border text-body text-text outline-none hover:text-blue-500 focus-visible:text-blue-500"
										href={category.href}
									>
										{category.label}
									</a>
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
