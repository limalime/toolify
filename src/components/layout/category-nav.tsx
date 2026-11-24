"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ToolIcon from "@/components/landing/tool-icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface CategoryNavItem {
	key: string;
	label: string;
	href: string;
	tools: Array<{
		slug: string;
		name: string;
		tagline: string;
		icon: string;
	}>;
}

// desktop category menus. click or hover opens a panel, escape closes it,
// and moving to another category swaps the open panel without a flash.
export default function CategoryNav({
	items,
	label,
}: {
	items: CategoryNavItem[];
	label: string;
}) {
	const [open, setOpen] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const cancelClose = () => {
		if (timer.current) {
			clearTimeout(timer.current);
			timer.current = null;
		}
	};

	const closeSoon = () => {
		cancelClose();
		timer.current = setTimeout(() => setOpen(null), 140);
	};

	useEffect(() => {
		if (!open) {
			return;
		}
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(null);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open]);

	return (
		<nav aria-label={label} className="hidden items-center gap-1 lg:flex">
			{items.map((item) => {
				const expanded = open === item.key;
				return (
					// biome-ignore lint/a11y/noStaticElementInteractions: hover is a convenience, the button and links are keyboard reachable
					<div
						className="relative"
						key={item.key}
						onBlurCapture={(event) => {
							if (
								!event.currentTarget.contains(event.relatedTarget as Node | null)
							) {
								setOpen(null);
							}
						}}
						onFocusCapture={() => {
							cancelClose();
							setOpen(item.key);
						}}
						onPointerEnter={() => {
							cancelClose();
							setOpen(item.key);
						}}
						onPointerLeave={closeSoon}
					>
						<button
							aria-controls={`category-${item.key}`}
							aria-expanded={expanded}
							className={cn(
								"inline-flex h-10 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-small outline-none transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-blue-500",
								expanded ? "text-text" : "text-text-2",
							)}
							onClick={() => setOpen(expanded ? null : item.key)}
							type="button"
						>
							{item.label}
							<ChevronDown
								aria-hidden="true"
								className={cn(
									"size-3.5 transition-transform duration-150 motion-reduce:transition-none",
									expanded && "rotate-180",
								)}
							/>
						</button>
						<div
							className={cn(
								"absolute start-0 top-full z-50 w-[30rem] pt-2 transition-[opacity,transform,visibility] duration-150 ease-out motion-reduce:transition-none",
								expanded
									? "visible translate-y-0 opacity-100"
									: "invisible -translate-y-1 opacity-0",
							)}
							id={`category-${item.key}`}
						>
							<div className="rounded-lg border border-border bg-surface p-2 shadow-modal">
								<div className="grid grid-cols-2 gap-1">
									{item.tools.map((tool) => (
										<Link
											className="flex min-h-14 items-start gap-2 rounded-md px-3 py-2 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
											href={`/${tool.slug}`}
											key={tool.slug}
											onClick={() => setOpen(null)}
											prefetch={false}
										>
											<ToolIcon
												className="mt-0.5 size-4 shrink-0 text-blue-500"
												name={tool.icon}
											/>
											<span className="flex min-w-0 flex-col">
												<span className="truncate text-small text-text">
													{tool.name}
												</span>
												<span className="line-clamp-2 text-caption text-text-3">
													{tool.tagline}
												</span>
											</span>
										</Link>
									))}
								</div>
								<Link
									className="mt-1 flex min-h-10 items-center justify-between rounded-md border-t border-border px-3 pt-2 text-small text-blue-500 outline-none hover:underline hover:underline-offset-4 focus-visible:text-blue-400"
									href={item.href}
									onClick={() => setOpen(null)}
								>
									{item.label}
									<span aria-hidden="true">→</span>
								</Link>
							</div>
						</div>
					</div>
				);
			})}
		</nav>
	);
}