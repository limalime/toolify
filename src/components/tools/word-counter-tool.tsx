"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useToolCompleted } from "@/components/analytics/use-tool-completed";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Textarea from "@/components/smoothui/textarea";
import { countText, formatReadingTime } from "@/lib/text/count";

export default function WordCounterTool() {
	const t = useTranslations("tools.word-counter");
	const [text, setText] = useState("");

	const counts = useMemo(() => countText(text), [text]);
	useToolCompleted(counts.words > 0);

	const stats: Array<{ key: string; value: string }> = [
		{ key: "words", value: String(counts.words) },
		{ key: "characters", value: String(counts.characters) },
		{ key: "charactersNoSpaces", value: String(counts.charactersNoSpaces) },
		{ key: "sentences", value: String(counts.sentences) },
		{ key: "paragraphs", value: String(counts.paragraphs) },
		{ key: "readingTime", value: formatReadingTime(counts.readingSeconds) },
	];

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<Field>
				<FieldLabel htmlFor="counter-text">{t("options.text")}</FieldLabel>
				<Textarea
					className="border-border bg-surface-2"
					id="counter-text"
					onChange={(event) => setText(event.target.value)}
					rows={8}
					value={text}
				/>
			</Field>
			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{stats.map((stat) => (
					<div
						className="rounded-lg border border-border bg-surface p-4"
						data-testid={`count-${stat.key}`}
						key={stat.key}
					>
						<dt className="text-small font-medium text-text-2">
							{t(`options.${stat.key}`)}
						</dt>
						<dd className="font-display text-h2 tabular-nums">{stat.value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
