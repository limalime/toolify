"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { LOCALES, localizedPath } from "@/lib/locales";
import { cn } from "@/lib/utils";

const ITEM_CLASS =
	"flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-small text-text outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

// dropdown of the seven locales by their own name, never a flag icon.
// every item is a real link to the same page in that locale.
export default function LanguageSwitcher({ id }: { id?: string }) {
	const pathname = usePathname();
	const current = useLocale();
	const t = useTranslations("header");
	const currentName =
		LOCALES.find((locale) => locale.code === current)?.name ?? "English";

	return (
		<Menu.Root>
			<Menu.Trigger
				aria-label={t("language")}
				className="inline-flex h-11 cursor-pointer items-center gap-1.5 border border-transparent px-3 text-small text-text-2 outline-none hover:text-text focus-visible:border-blue-500"
				id={id}
				render={
					<button type="button">
						<Languages aria-hidden="true" className="size-4" />
						<span className="hidden sm:inline">{currentName}</span>
						<ChevronDown aria-hidden="true" className="size-4" />
					</button>
				}
			/>
			<Menu.Portal>
				<Menu.Positioner
					align="end"
					className="z-50 outline-none"
					side="bottom"
					sideOffset={4}
				>
					<Menu.Popup className="overlay-surface max-h-[var(--available-height)] min-w-44 origin-top overflow-y-auto border bg-popover p-1 text-popover-foreground transition-opacity duration-150 data-starting-style:opacity-0 motion-reduce:transition-none">
						<Menu.Group aria-label={t("languages")}>
							{LOCALES.map((locale) => {
								const active = locale.code === current;
								return (
									<Menu.Item
										className={ITEM_CLASS}
										closeOnClick
										key={locale.code}
										render={
											<a
												aria-current={active ? "true" : undefined}
												href={localizedPath(pathname, locale.code)}
											>
												<span className="flex-1">{locale.name}</span>
												{active ? (
													<Check
														aria-hidden="true"
														className="size-4 text-blue-500"
													/>
												) : null}
											</a>
										}
									/>
								);
							})}
						</Menu.Group>
					</Menu.Popup>
				</Menu.Positioner>
			</Menu.Portal>
		</Menu.Root>
	);
}

export function InlineLocaleList({ className }: { className?: string }) {
	const pathname = usePathname();
	return (
		<ul className={cn("flex flex-wrap gap-x-4 gap-y-2", className)}>
			{LOCALES.map((locale) => (
				<li key={locale.code}>
					<a
						className="text-small text-text-2 outline-none hover:text-text hover:underline hover:underline-offset-4 focus-visible:text-blue-500"
						href={localizedPath(pathname, locale.code)}
					>
						{locale.name}
					</a>
				</li>
			))}
		</ul>
	);
}
