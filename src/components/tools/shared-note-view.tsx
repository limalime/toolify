"use client";

import { Copy, PenLine } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import { Link } from "@/i18n/navigation";
import { copyText } from "@/lib/text/clipboard";
import { decodeNote } from "@/lib/text/rich-text";

export default function SharedNoteView() {
	const t = useTranslations("tools.online-notes");
	const params = useParams<{ id: string }>();
	const [mounted, setMounted] = useState(false);

	// the share payload is sanitized with DOMParser, which only exists in
	// the browser. decoding during ssr would render the missing branch and
	// then swap it on hydration, so decode after mount instead.
	useEffect(() => {
		setMounted(true);
	}, []);

	const payload = useMemo(
		() => (mounted ? decodeNote(params.id ?? "") : null),
		[mounted, params.id],
	);

	if (!mounted) {
		return null;
	}

	if (!payload) {
		return (
			<div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-surface p-6">
				<h1 className="font-display text-h2">{t("options.sharedTitle")}</h1>
				<p className="text-body text-text-2">{t("options.sharedMissing")}</p>
				<SmoothButton asChild variant="candy">
					<Link href="/online-notes">{t("options.sharedWrite")}</Link>
				</SmoothButton>
			</div>
		);
	}

	const title = payload.title.trim() || t("options.titlePlaceholder");

	return (
		<article className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6 md:p-8">
			<div className="flex flex-col gap-2">
				<p className="text-caption uppercase tracking-wide text-text-3">
					{t("options.sharedLabel")}
				</p>
				<h1 className="font-display text-h1">{title}</h1>
			</div>
			<div
				className="notes-editor text-body text-text"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: decodeNote sanitizes every tag and attribute
				dangerouslySetInnerHTML={{ __html: payload.body }}
				style={{ lineHeight: payload.lineHeight }}
			/>
			<div className="flex flex-wrap gap-2 border-t border-border pt-4">
				<SmoothButton
					onClick={async () => {
						if (await copyText(window.location.href)) {
							notify.success(t("options.linkCopied"));
						} else {
							notify.error(t("options.copyLink"));
						}
					}}
					size="sm"
					variant="secondary"
				>
					<Copy aria-hidden="true" className="size-4" />
					{t("options.copyLink")}
				</SmoothButton>
				<SmoothButton asChild size="sm" variant="secondary">
					<Link href="/online-notes">
						<PenLine aria-hidden="true" className="size-4" />
						{t("options.sharedWrite")}
					</Link>
				</SmoothButton>
			</div>
		</article>
	);
}
