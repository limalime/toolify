"use client";

import { Delete, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	CalcError,
	evaluateCalculator,
	formatResult,
} from "@/lib/finance/calc";
import { cn } from "@/lib/utils";

const KEYS = [
	["C", "(", ")", "÷"],
	["7", "8", "9", "×"],
	["4", "5", "6", "-"],
	["1", "2", "3", "+"],
	["0", ".", "%", "="],
] as const;

export default function CalculatorTool() {
	const t = useTranslations("tools.calculator");
	const [expression, setExpression] = useState("");
	const [preview, setPreview] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([]);

	useEffect(() => {
		if (!expression.trim()) {
			setPreview("");
			setError(null);
			return;
		}
		try {
			setPreview(formatResult(evaluateCalculator(expression)));
			setError(null);
		} catch {
			setPreview("");
		}
	}, [expression]);

	const press = (key: string) => {
		setError(null);
		if (key === "C") {
			setExpression("");
			return;
		}
		if (key === "=") {
			if (!expression.trim()) {
				return;
			}
			try {
				const result = formatResult(evaluateCalculator(expression));
				setHistory((current) =>
					[{ expression, result }, ...current].slice(0, 12),
				);
				setExpression(result);
			} catch (unknown) {
				setError(
					unknown instanceof CalcError && unknown.message === "divide by zero"
						? t("options.divideByZero")
						: t("options.invalid"),
				);
			}
			return;
		}
		setExpression((current) => `${current}${key}`);
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Enter" || event.key === "=") {
				event.preventDefault();
				press("=");
			} else if (event.key === "Escape") {
				press("C");
			} else if (event.key === "Backspace") {
				event.preventDefault();
				setExpression((current) => current.slice(0, -1));
			} else if (/^[0-9.+\-*/%()]$/.test(event.key)) {
				press(event.key);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-6">
				<div
					aria-live="polite"
					className="flex min-h-28 flex-col items-end justify-end gap-1 rounded-lg bg-surface-2 p-4"
				>
					<input
						aria-label={t("options.expression")}
						className="w-full bg-transparent text-end font-display text-h1 text-text outline-none"
						data-testid="calculator-display"
						onChange={(event) => setExpression(event.target.value)}
						placeholder="0"
						spellCheck={false}
						value={expression}
					/>
					<span className="text-body text-text-3">
						{error ?? (preview && preview !== expression ? `= ${preview}` : "")}
					</span>
				</div>
				<div className="grid grid-cols-4 gap-2">
					{KEYS.flat().map((key) => (
						<button
							aria-label={key === "C" ? t("options.clear") : key}
							className={cn(
								"min-h-14 cursor-pointer rounded-lg border border-border text-h3 font-display outline-none transition-colors hover:bg-surface-2 focus-visible:border-blue-500 active:bg-surface-3",
								key === "=" || key === "C"
									? "bg-blue-500 text-white hover:bg-blue-600"
									: "bg-surface text-text",
							)}
							key={key}
							onClick={() => press(key)}
							type="button"
						>
							{key === "C" ? <RotateCcw aria-hidden="true" className="mx-auto size-5" /> : key}
						</button>
					))}
				</div>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex items-center justify-between gap-2">
					<h2 className="font-display text-h3">{t("options.history")}</h2>
					{history.length > 0 ? (
						<SmoothButton
							onClick={() => setHistory([])}
							size="sm"
							variant="ghost"
						>
							<Delete aria-hidden="true" className="size-4" />
							{t("options.clearHistory")}
						</SmoothButton>
					) : null}
				</div>
				{history.length === 0 ? (
					<p className="text-small text-text-3">{t("options.noHistory")}</p>
				) : (
					<ol className="flex flex-col gap-2" data-testid="calculator-history">
						{history.map((entry, index) => (
							<li
								className="flex flex-col rounded-md border border-border bg-surface-2 px-3 py-2 text-small"
								key={`${entry.expression}-${index}`}
							>
								<span className="text-text-3">{entry.expression}</span>
								<span className="font-mono text-text">= {entry.result}</span>
							</li>
						))}
					</ol>
				)}
			</div>
		</div>
	);
}