"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Textarea from "@/components/smoothui/textarea";
import { CASE_STYLES, convertCase } from "@/lib/text/case";
import { copyText } from "@/lib/text/clipboard";

export default function CaseConverterTool() {
	const t = useTranslations("tools.case-converter");
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
				<FieldLabel htmlFor="case-text">{t("options.text")}</FieldLabel>
				<Textarea
					className="border-border bg-surface-2"
					id="case-text"
					onChange={(event) => setText(event.target.value)}
					rows={4}
					value={text}
				/>
			</Field>
			{text ? (
				<div className="grid gap-3 sm:grid-cols-2">
					{CASE_STYLES.map((style) => {
						const converted = convertCase(text, style);
						return (
							<button
								className="cursor-pointer rounded-lg border border-border bg-surface p-4 text-start outline-none transition-colors hover:border-blue-500 focus-visible:border-blue-500"
								data-testid={`case-card-${style}`}
								key={style}
								onClick={() => copy(converted)}
								type="button"
							>
								<span className="block text-small font-medium text-text-2">
									{t(`options.styles.${style}`)}
								</span>
								<span className="block truncate">{converted || " "}</span>
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
