"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { selectTriggerClass } from "@/lib/control-classes";
import {
	tagBalance,
	validateJson,
	type TextPosition,
} from "@/lib/text/validate";

type Language = "json" | "javascript" | "html" | "xml" | "css";

const LANGUAGES: Language[] = ["json", "javascript", "html", "xml", "css"];

interface Validation {
	ok: boolean;
	message?: string;
	position?: TextPosition;
}

function validateXml(text: string): Validation {
	if (typeof DOMParser === "undefined") {
		return { ok: true };
	}
	const doc = new DOMParser().parseFromString(text, "application/xml");
	const error = doc.querySelector("parsererror");
	return error
		? { ok: false, message: error.textContent?.trim() || "invalid xml" }
		: { ok: true };
}

function validateCss(text: string): Validation {
	if (typeof CSSStyleSheet === "undefined") {
		return { ok: true };
	}
	try {
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(text);
		return { ok: true };
	} catch (unknown) {
		return {
			ok: false,
			message: unknown instanceof Error ? unknown.message : "invalid css",
		};
	}
}

function validateJavaScript(text: string): Validation {
	try {
		// compiles the source without running it
		new Function(text);
		return { ok: true };
	} catch (unknown) {
		return {
			ok: false,
			message: unknown instanceof Error ? unknown.message : "invalid javascript",
		};
	}
}

export default function CodeValidatorTool() {
	const t = useTranslations("tools.code-validator");
	const [language, setLanguage] = useState<Language>("json");
	const [code, setCode] = useState('{\n  "name": "Toolify",\n  "free": true\n}');
	const [result, setResult] = useState<Validation | null>(null);

	const lines = useMemo(() => code.split("\n").length, [code]);

	const check = () => {
		if (!code.trim()) {
			setResult({ ok: false, message: t("options.empty") });
			return;
		}
		if (language === "json") {
			const json = validateJson(code);
			setResult({
				ok: json.ok,
				message: json.ok ? undefined : t("options.invalidJson"),
				position: json.position,
			});
			return;
		}
		if (language === "html") {
			const balance = tagBalance(code);
			setResult(
				balance.ok
					? { ok: true }
					: {
							ok: false,
							message: t("options.unclosed", {
								tags: [...balance.unclosed, ...balance.unexpected].join(", "),
							}),
						},
			);
			return;
		}
		if (language === "xml") {
			setResult(validateXml(code));
			return;
		}
		if (language === "css") {
			setResult(validateCss(code));
			return;
		}
		setResult(validateJavaScript(code));
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<textarea
					aria-label={t("options.code")}
					className="min-h-96 w-full resize-y rounded-lg border border-border bg-surface p-4 font-mono text-small leading-relaxed text-text outline-none focus-visible:border-blue-500"
					data-testid="validator-input"
					dir="ltr"
					onChange={(event) => {
						setCode(event.target.value);
						setResult(null);
					}}
					rows={18}
					spellCheck={false}
					value={code}
				/>
				<div className="flex flex-wrap items-center gap-3">
					<SmoothButton onClick={check} size="lg">
						{t("options.check")}
					</SmoothButton>
					<span className="text-small text-text-3">
						{t("options.stats", { lines })}
					</span>
				</div>
				{result ? (
					<div
						className={`flex flex-col gap-2 rounded-lg border p-4 ${
							result.ok
								? "border-success/40 bg-success/10"
								: "border-error/40 bg-error/10"
						}`}
						data-testid="validator-result"
					>
						<p className="flex items-center gap-2 font-medium text-text">
							{result.ok ? (
								<CheckCircle2 aria-hidden="true" className="size-5 text-success" />
							) : (
								<XCircle aria-hidden="true" className="size-5 text-error" />
							)}
							{result.ok ? t("options.valid") : t("options.invalid")}
						</p>
						{!result.ok && result.message ? (
							<p className="break-words font-mono text-small text-text-2">
								{result.message}
							</p>
						) : null}
						{!result.ok && result.position ? (
							<p className="text-small text-text-3">
								{t("options.position", {
									line: result.position.line,
									column: result.position.column,
								})}
							</p>
						) : null}
					</div>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="validator-language">
						{t("options.language")}
					</FieldLabel>
					<Select
						aria-label={t("options.language")}
						className={selectTriggerClass}
						onValueChange={(value) => {
							setLanguage(value as Language);
							setResult(null);
						}}
						options={LANGUAGES.map((entry) => ({
							label: entry === "json" ? "JSON" : entry.toUpperCase(),
							value: entry,
						}))}
						value={language}
					/>
				</Field>
				<p className="text-small text-text-2">{t("options.hint")}</p>
				<p className="text-caption text-text-3">{t("options.limits")}</p>
			</div>
		</div>
	);
}