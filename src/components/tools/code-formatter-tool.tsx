"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import Textarea from "@/components/smoothui/textarea";
import { tabActiveClass } from "@/lib/control-classes";
import { copyText } from "@/lib/text/clipboard";
import {
	type FormatError,
	type FormatResult,
	formatJson,
	formatMarkdown,
	formatXml,
	minifyJson,
	minifyMarkdown,
	minifyXml,
} from "@/lib/text/format";

type DocFormat = "json" | "xml" | "markdown";

async function runFormatter(
	format: DocFormat,
	mode: string,
	input: string,
): Promise<FormatResult> {
	if (format === "json") {
		return mode === "minify" ? minifyJson(input) : formatJson(input);
	}
	if (format === "xml") {
		return mode === "minify" ? minifyXml(input) : formatXml(input);
	}
	if (mode === "minify") {
		return minifyMarkdown(input);
	}
	return formatMarkdown(input);
}

export default function CodeFormatterTool() {
	const t = useTranslations("tools.code-formatter");
	const tc = useTranslations("common");
	const [format, setFormat] = useState<DocFormat>("json");
	const [mode, setMode] = useState("format");
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState<FormatError | null>(null);

	useEffect(() => {
		let live = true;
		if (!input.trim()) {
			setOutput("");
			setError(null);
			return;
		}
		runFormatter(format, mode, input).then((result) => {
			if (!live) {
				return;
			}
			if (result.ok) {
				setOutput(result.value);
				setError(null);
			} else {
				setOutput("");
				setError(result.error);
			}
		});
		return () => {
			live = false;
		};
	}, [input, format, mode]);

	const copy = async () => {
		if (!output) {
			notify.warning(error ? formatErrorText(error) : t("options.input"));
			return;
		}
		if (await copyText(output)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), output.slice(0, 120));
		}
	};

	const formatErrorText = (detail: FormatError): string =>
		`${t(`options.errors.${detail.code}`, { tag: detail.detail || "?" })} ${t("options.errorLine", { line: detail.line })}`;

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="format-input">{t("options.input")}</FieldLabel>
					<Textarea
						className="border-border bg-surface-2 font-mono"
						id="format-input"
						onChange={(event) => setInput(event.target.value)}
						rows={8}
						value={input}
					/>
				</Field>
				{error ? (
					<p className="text-small text-error" role="alert">
						{formatErrorText(error)}
					</p>
				) : null}
				{output ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						<figure className="flex flex-col gap-3">
							<figcaption
								className="text-small font-medium"
								id="format-output-label"
							>
								{t("options.output")}
							</figcaption>
							<pre
								aria-labelledby="format-output-label"
								className="overflow-x-auto font-mono text-small whitespace-pre"
								data-testid="format-output"
								role="status"
							>
								{output}
							</pre>
						</figure>
						<SmoothButton onClick={copy} size="sm" variant="secondary">
							{tc("copy")}
						</SmoothButton>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="format-format-label">
						{t("options.format")}
					</span>
					<TabsRoot
						defaultValue="json"
						onValueChange={(value) => setFormat(value as DocFormat)}
					>
						<TabsList aria-labelledby="format-format-label">
							<TabsTab className={tabActiveClass} value="json">
								{t("options.formatJson")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="xml">
								{t("options.formatXml")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="markdown">
								{t("options.formatMarkdown")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="format-mode-label">
						{t("options.mode")}
					</span>
					<TabsRoot defaultValue="format" onValueChange={setMode}>
						<TabsList aria-labelledby="format-mode-label">
							<TabsTab className={tabActiveClass} value="format">
								{t("options.modeFormat")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="minify">
								{t("options.modeMinify")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
			</div>
		</div>
	);
}
