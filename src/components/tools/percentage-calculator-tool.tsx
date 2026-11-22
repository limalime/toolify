"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useToolCompleted } from "@/components/analytics/use-tool-completed";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import {
	TabsIndicator,
	TabsList,
	TabsPanel,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import {
	decreasedValue,
	increasedValue,
	percentChange,
	percentOf,
} from "@/lib/finance/percentage";

type Mode = "of" | "change" | "increase";

export default function PercentageCalculatorTool() {
	const t = useTranslations("tools.percentage-calculator");
	const locale = useLocale();
	const [mode, setMode] = useState<Mode>("of");
	const [ofPercent, setOfPercent] = useState("15");
	const [ofValue, setOfValue] = useState("240");
	const [changeFrom, setChangeFrom] = useState("80");
	const [changeTo, setChangeTo] = useState("100");
	const [stepValue, setStepValue] = useState("200");
	const [stepPercent, setStepPercent] = useState("10");

	const numberFormat = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				maximumFractionDigits: 4,
			}),
		[locale],
	);
	const percentFormat = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				maximumFractionDigits: 2,
				style: "percent",
			}),
		[locale],
	);

	const ofValid = ofPercent.trim() !== "" && ofValue.trim() !== "";
	const ofResult = ofValid
		? percentOf(Number(ofPercent), Number(ofValue))
		: null;

	const changeValid = changeFrom.trim() !== "" && changeTo.trim() !== "";
	const change = changeValid
		? percentChange(Number(changeFrom), Number(changeTo))
		: null;

	const stepValid = stepValue.trim() !== "" && stepPercent.trim() !== "";
	const increased = stepValid
		? increasedValue(Number(stepValue), Number(stepPercent))
		: null;
	const decreased = stepValid
		? decreasedValue(Number(stepValue), Number(stepPercent))
		: null;

	useToolCompleted(ofResult !== null || change !== null || increased !== null);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<TabsRoot onValueChange={(value) => setMode(value as Mode)} value={mode}>
				<TabsList variant="segment">
					<TabsTab
						className={`${tabActiveClass} whitespace-normal px-2 text-center`}
						value="of"
					>
						{t("options.modeOf")}
					</TabsTab>
					<TabsTab
						className={`${tabActiveClass} whitespace-normal px-2 text-center`}
						value="change"
					>
						{t("options.modeChange")}
					</TabsTab>
					<TabsTab
						className={`${tabActiveClass} whitespace-normal px-2 text-center`}
						value="increase"
					>
						{t("options.modeIncrease")}
					</TabsTab>
					<TabsIndicator />
				</TabsList>
				<TabsPanel value="of">
					<div className="flex flex-col gap-4">
						<div className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2 md:p-6">
							<Field>
								<FieldLabel htmlFor="pct-of-percent">
									{t("options.percent")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-of-percent"
									id="pct-of-percent"
									inputMode="decimal"
									onChange={(event) => setOfPercent(event.target.value)}
									step="any"
									type="number"
									value={ofPercent}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="pct-of-value">
									{t("options.value")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-of-value"
									id="pct-of-value"
									inputMode="decimal"
									onChange={(event) => setOfValue(event.target.value)}
									step="any"
									type="number"
									value={ofValue}
								/>
							</Field>
						</div>
						<div className="rounded-lg border border-border bg-surface p-5 md:p-6">
							<span className="text-small font-medium text-text-2">
								{t("options.result")}
							</span>
							<output
								aria-live="polite"
								className="block font-display text-h2 tabular-nums break-words"
								data-testid="pct-of-result"
							>
								{ofResult === null ? "" : numberFormat.format(ofResult)}
							</output>
							{!ofValid ? (
								<p className="text-small text-destructive-ink">
									{t("options.invalid")}
								</p>
							) : null}
						</div>
					</div>
				</TabsPanel>
				<TabsPanel value="change">
					<div className="flex flex-col gap-4">
						<div className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2 md:p-6">
							<Field>
								<FieldLabel htmlFor="pct-change-from">
									{t("options.from")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-change-from"
									id="pct-change-from"
									inputMode="decimal"
									onChange={(event) => setChangeFrom(event.target.value)}
									step="any"
									type="number"
									value={changeFrom}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="pct-change-to">
									{t("options.to")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-change-to"
									id="pct-change-to"
									inputMode="decimal"
									onChange={(event) => setChangeTo(event.target.value)}
									step="any"
									type="number"
									value={changeTo}
								/>
							</Field>
						</div>
						<div className="rounded-lg border border-border bg-surface p-5 md:p-6">
							<span className="text-small font-medium text-text-2">
								{t("options.result")}
							</span>
							<output
								aria-live="polite"
								className="block font-display text-h2 tabular-nums break-words"
								data-testid="pct-change-result"
							>
								{change === null ? "" : percentFormat.format(change / 100)}
							</output>
							{change === null && changeValid ? (
								<p className="text-small text-text-2">
									{t("options.undefined")}
								</p>
							) : null}
							{change !== null ? (
								<p className="text-small text-text-2">
									{change > 0
										? t("options.changeUp")
										: change < 0
											? t("options.changeDown")
											: t("options.noChange")}
								</p>
							) : null}
							{!changeValid ? (
								<p className="text-small text-destructive-ink">
									{t("options.invalid")}
								</p>
							) : null}
						</div>
					</div>
				</TabsPanel>
				<TabsPanel value="increase">
					<div className="flex flex-col gap-4">
						<div className="grid gap-3 rounded-lg border border-border bg-surface p-5 sm:grid-cols-2 md:p-6">
							<Field>
								<FieldLabel htmlFor="pct-step-value">
									{t("options.value")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-step-value"
									id="pct-step-value"
									inputMode="decimal"
									onChange={(event) => setStepValue(event.target.value)}
									step="any"
									type="number"
									value={stepValue}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="pct-step-percent">
									{t("options.percent")}
								</FieldLabel>
								<Input
									className={inputClass}
									data-testid="pct-step-percent"
									id="pct-step-percent"
									inputMode="decimal"
									onChange={(event) => setStepPercent(event.target.value)}
									step="any"
									type="number"
									value={stepPercent}
								/>
							</Field>
						</div>
						<dl className="grid gap-3 sm:grid-cols-2">
							<div className="rounded-lg border border-border bg-surface p-5 md:p-6">
								<dt className="text-small font-medium text-text-2">
									{t("options.increased")}
								</dt>
								<dd
									className="font-display text-h2 tabular-nums break-words"
									data-testid="pct-increased"
								>
									{increased === null ? "" : numberFormat.format(increased)}
								</dd>
							</div>
							<div className="rounded-lg border border-border bg-surface p-5 md:p-6">
								<dt className="text-small font-medium text-text-2">
									{t("options.decreased")}
								</dt>
								<dd
									className="font-display text-h2 tabular-nums break-words"
									data-testid="pct-decreased"
								>
									{decreased === null ? "" : numberFormat.format(decreased)}
								</dd>
							</div>
						</dl>
						{!stepValid ? (
							<p className="text-small text-destructive-ink">
								{t("options.invalid")}
							</p>
						) : null}
					</div>
				</TabsPanel>
			</TabsRoot>
			<p className="text-small text-text-2">{t("options.localNote")}</p>
		</div>
	);
}
