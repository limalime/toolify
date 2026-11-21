"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import { inputClass } from "@/lib/control-classes";
import { ASCII_FONT_STYLES, convertAsciiFont } from "@/lib/text/ascii-fonts";
import { copyText } from "@/lib/text/clipboard";

export default function AsciiFontsTool() {
	const t = useTranslations("tools.ascii-fonts");
	const tc = useTranslations("common");
	const [text, setText] = useState("");

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
				<FieldLabel htmlFor="fancy-text">{t("options.text")}</FieldLabel>
				<FieldControl
					autoComplete="off"
					className={inputClass}
					id="fancy-text"
					maxLength={120}
					onChange={(event) => setText(event.target.value)}
					value={text}
				/>
			</Field>
			{text.trim() ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{ASCII_FONT_STYLES.map((style) => {
						const converted = convertAsciiFont(text, style);
						return (
							<button
								className="cursor-pointer rounded-lg border border-border bg-surface p-4 text-start outline-none transition-colors hover:border-blue-500 focus-visible:border-blue-500"
								data-testid={`font-card-${style}`}
								key={style}
								onClick={() => copy(converted)}
								type="button"
							>
								<span className="block text-small font-medium text-text-2">
									{t(`options.styles.${style}`)}
								</span>
								<span className="block truncate text-h3">{converted}</span>
							</button>
						);
					})}
				</div>
			) : (
				<p className="text-small text-text-2">{t("options.hint")}</p>
			)}
		</div>
	);
}
