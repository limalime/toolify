"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Textarea from "@/components/smoothui/textarea";
import { copyText } from "@/lib/text/clipboard";
import { encodeAll } from "@/lib/text/encodings";

const ROWS = [
	"hex",
	"base64",
	"base32",
	"binary",
	"rot13",
	"html",
	"keccak256",
	"keccak512",
	"crc32",
] as const;

type Row = (typeof ROWS)[number];

export default function TextEncodingsTool() {
	const t = useTranslations("tools.text-encodings");
	const tc = useTranslations("common");
	const [text, setText] = useState("");

	const encodings = useMemo(() => (text ? encodeAll(text) : null), [text]);

	const copy = async (value: string) => {
		if (await copyText(value)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), value.slice(0, 120));
		}
	};

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<Field>
				<FieldLabel htmlFor="encodings-text">{t("options.text")}</FieldLabel>
				<Textarea
					className="border-border bg-surface-2"
					id="encodings-text"
					onChange={(event) => setText(event.target.value)}
					rows={3}
					value={text}
				/>
			</Field>
			{encodings ? (
				<div className="flex flex-col gap-3">
					{ROWS.map((row: Row) => (
						<button
							className="cursor-pointer rounded-lg border border-border bg-surface p-4 text-start outline-none transition-colors hover:border-blue-500 focus-visible:border-blue-500"
							data-testid={`encoding-${row}`}
							key={row}
							onClick={() => copy(encodings[row])}
							type="button"
						>
							<span className="block text-small font-medium text-text-2">
								{t(`options.labels.${row}`)}
							</span>
							<span className="block truncate font-mono text-small">
								{encodings[row]}
							</span>
						</button>
					))}
				</div>
			) : (
				<p className="text-small text-text-2">{t("options.hint")}</p>
			)}
		</div>
	);
}
