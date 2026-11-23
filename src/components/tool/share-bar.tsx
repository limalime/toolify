"use client";

import {
	Briefcase,
	Bug,
	Check,
	Copy,
	MessageCircle,
	Send,
	Share2,
	ThumbsUp,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import { Link } from "@/i18n/navigation";
import { type LocaleCode, localizedPath } from "@/lib/locales";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const BUTTON_CLASS =
	"inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-small font-medium text-text-2 outline-none transition-colors hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-blue-500";

// share and report sit under the h1 on every tool page. the menu uses the
// native share sheet when the browser has one, then falls back to networks.
export default function ShareBar({
	name,
	slug,
}: {
	name: string;
	slug: string;
}) {
	const t = useTranslations("share");
	const locale = useLocale() as LocaleCode;
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [url, setUrl] = useState(
		`${SITE_URL}${localizedPath(`/${slug}`, locale)}`,
	);
	const wrap = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setUrl(`${window.location.origin}${localizedPath(`/${slug}`, locale)}`);
	}, [slug, locale]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onPointer = (event: PointerEvent) => {
			if (!wrap.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};
		document.addEventListener("pointerdown", onPointer);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("pointerdown", onPointer);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const text = t("text", { name });

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			notify.success(t("copied"));
			setTimeout(() => setCopied(false), 2000);
		} catch {
			notify.error(t("copyLink"), url);
		}
	};

	const native = async () => {
		if (navigator.share) {
			try {
				await navigator.share({ title: name, text, url });
				setOpen(false);
			} catch {
				// the share sheet was dismissed, nothing to report
			}
			return;
		}
		await copy();
	};

	const links = [
		{
			key: "whatsapp",
			label: t("whatsapp"),
			href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
			icon: MessageCircle,
		},
		{
			key: "x",
			label: t("x"),
			href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
			icon: Send,
		},
		{
			key: "facebook",
			label: t("facebook"),
			href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
			icon: ThumbsUp,
		},
		{
			key: "linkedin",
			label: t("linkedin"),
			href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
			icon: Briefcase,
		},
	];

	return (
		<div
			className="relative flex w-full max-w-xl divide-x divide-border overflow-visible rounded-lg border border-border bg-surface"
			data-testid="share-bar"
			ref={wrap}
		>
			<button
				aria-expanded={open}
				className={cn(BUTTON_CLASS, "rounded-s-lg")}
				onClick={() => setOpen((current) => !current)}
				type="button"
			>
				<Share2 aria-hidden="true" className="size-5" />
				{t("share")}
			</button>
			<Link
				className={cn(BUTTON_CLASS, "rounded-e-lg")}
				href={`/contact?tool=${slug}`}
			>
				<Bug aria-hidden="true" className="size-5" />
				{t("report")}
			</Link>

			{open ? (
				<div className="absolute start-0 top-full z-40 mt-2 w-full min-w-64 rounded-lg border border-border bg-surface p-2 shadow-modal">
					<p className="px-3 py-2 text-caption text-text-3">{t("title")}</p>
					<button
						className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-start text-small text-text outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
						onClick={native}
						type="button"
					>
						<Share2 aria-hidden="true" className="size-4 text-blue-500" />
						{t("native")}
					</button>
					{links.map((entry) => (
						<a
							className="flex min-h-11 items-center gap-2 rounded-md px-3 text-small text-text outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
							href={entry.href}
							key={entry.key}
							onClick={() => setOpen(false)}
							rel="noopener noreferrer"
							target="_blank"
						>
							<entry.icon
								aria-hidden="true"
								className="size-4 text-blue-500"
							/>
							{entry.label}
						</a>
					))}
					<button
						className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md border-t border-border px-3 pt-2 text-start text-small text-text outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
						onClick={copy}
						type="button"
					>
						{copied ? (
							<Check aria-hidden="true" className="size-4 text-success" />
						) : (
							<Copy aria-hidden="true" className="size-4 text-blue-500" />
						)}
						{copied ? t("copied") : t("copyLink")}
					</button>
					<p className="px-3 pb-1 pt-2 text-caption text-text-3">
						{t("reportHint")}
					</p>
				</div>
			) : null}
		</div>
	);
}