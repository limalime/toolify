"use client";

import { Copy, Download, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import { selectTriggerClass } from "@/lib/control-classes";
import { downloadBlob } from "@/lib/images/download";
import { generateLorem, wordCount } from "@/lib/text/lorem";
import { copyText } from "@/lib/text/clipboard";

export default function LoremIpsumTool() {
	const t = useTranslations("tools.lorem-ipsum");
	const [paragraphs, setParagraphs] = useState("3");
	const [sentences, setSentences] = useState("4");
	const [startWithLorem, setStartWithLorem] = useState(true);
	const [text, setText] = useState("");

	const build = () => {
		setText(
			generateLorem({
				paragraphs: Number(paragraphs),
				sentences: Number(sentences),
				startWithLorem,
			}),
		);
	};

	useEffect(() => {
		build();
		// first render only, later runs are explicit
		// biome-ignore lint/correctness/useExhaustiveDependencies: initial sample
	}, []);

	const copy = async () => {
		if (await copyText(text)) {
			notify.success(t("options.copied"));
		} else {
			notify.error(t("options.copy"));
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="lorem-paragraphs">
						{t("options.paragraphs")}
					</FieldLabel>
					<Select
						aria-label={t("options.paragraphs")}
						className={selectTriggerClass}
						onValueChange={setParagraphs}
						options={["1", "2", "3", "4", "5", "6", "8", "10"].map(
							(value) => ({ label: value, value }),
						)}
						value={paragraphs}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="lorem-sentences">
						{t("options.sentences")}
					</FieldLabel>
					<Select
						aria-label={t("options.sentences")}
						className={selectTriggerClass}
						onValueChange={setSentences}
						options={["2", "3", "4", "5", "6", "8"].map((value) => ({
							label: value,
							value,
						}))}
						value={sentences}
					/>
				</Field>
				<div className="flex items-center justify-between gap-3">
					<span className="text-small font-medium">{t("options.start")}</span>
					<Switch
						aria-label={t("options.start")}
						checked={startWithLorem}
						onCheckedChange={setStartWithLorem}
					/>
				</div>
				<SmoothButton onClick={build} size="lg">
					<RefreshCw aria-hidden="true" className="size-4" />
					{t("options.generate")}
				</SmoothButton>
				<p className="text-caption text-text-3">
					{t("options.words", { count: wordCount(text) })}
				</p>
			</div>

			<div className="flex min-w-0 flex-col gap-3">
				<textarea
					aria-label={t("options.output")}
					className="min-h-96 w-full resize-y rounded-lg border border-border bg-surface p-4 text-body leading-relaxed text-text outline-none focus-visible:border-blue-500"
					data-testid="lorem-output"
					dir="ltr"
					readOnly
					rows={16}
					value={text}
				/>
				<div className="flex flex-wrap gap-2">
					<SmoothButton onClick={copy} size="sm" variant="secondary">
						<Copy aria-hidden="true" className="size-4" />
						{t("options.copy")}
					</SmoothButton>
					<SmoothButton
						onClick={() =>
							downloadBlob(
								new Blob([text], { type: "text/plain" }),
								"lorem-ipsum.txt",
							)
						}
						size="sm"
						variant="secondary"
					>
						<Download aria-hidden="true" className="size-4" />
						{t("options.download")}
					</SmoothButton>
				</div>
			</div>
		</div>
	);
}