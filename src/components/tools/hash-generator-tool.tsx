"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Textarea from "@/components/smoothui/textarea";
import { copyText } from "@/lib/text/clipboard";
import { HASH_NAMES, type HashName, hashAll } from "@/lib/text/hash";

export default function HashGeneratorTool() {
	const t = useTranslations("tools.hash-generator");
	const tc = useTranslations("common");
	const [text, setText] = useState("");
	const [hashes, setHashes] = useState<Record<HashName, string> | null>(null);

	useEffect(() => {
		let live = true;
		if (!text) {
			setHashes(null);
			return;
		}
		hashAll(text).then((result) => {
			if (live) {
				setHashes(result);
			}
		});
		return () => {
			live = false;
		};
	}, [text]);

	const copy = async (value: string) => {
		if (await copyText(value)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), value.slice(0, 64));
		}
	};

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<Field>
				<FieldLabel htmlFor="hash-text">{t("options.text")}</FieldLabel>
				<Textarea
					className="border-border bg-surface-2"
					id="hash-text"
					onChange={(event) => setText(event.target.value)}
					rows={4}
					value={text}
				/>
			</Field>
			<p className="text-small text-text-2">{t("options.localNote")}</p>
			{hashes ? (
				<div className="flex flex-col gap-3">
					{HASH_NAMES.map((name) => (
						<div
							className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:gap-4"
							data-testid={`hash-${name}`}
							key={name}
						>
							<span className="w-16 shrink-0 font-display text-small text-text-2 uppercase">
								{name === "md5" ? "MD5" : name.replace("sha", "SHA-")}
							</span>
							<code className="min-w-0 flex-1 overflow-x-auto font-mono text-small break-all">
								{hashes[name]}
							</code>
							<button
								className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-border bg-surface-2 px-3 text-small outline-none transition-colors hover:text-text focus-visible:border-blue-500"
								onClick={() => copy(hashes[name])}
								type="button"
							>
								{tc("copy")}
							</button>
						</div>
					))}
				</div>
			) : null}
		</div>
	);
}
