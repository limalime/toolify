"use client";

import { ArrowRightLeft, Check, Copy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import {
	inputClass,
	selectTriggerClass,
	tabActiveClass,
} from "@/lib/control-classes";
import {
	convertUnit,
	DEFAULT_UNITS,
	formatUnitValue,
	UNIT_CATEGORIES,
	type UnitCategory,
	unitOptions,
} from "@/lib/convert/units";

type CopyState = "idle" | "copied" | "failed";

export default function UnitConverterTool() {
	const t = useTranslations("tools.unit-converter");
	const tc = useTranslations("common");
	const locale = useLocale();

	const [category, setCategory] = useState<UnitCategory>("length");
	const [value, setValue] = useState("1");
	const [from, setFrom] = useState(DEFAULT_UNITS.length[0]);
	const [to, setTo] = useState(DEFAULT_UNITS.length[1]);
	const [copyState, setCopyState] = useState<CopyState>("idle");

	useEffect(() => {
		if (copyState === "idle") {
			return;
		}
		const timer = setTimeout(() => setCopyState("idle"), 2000);
		return () => clearTimeout(timer);
	}, [copyState]);

	const options = unitOptions(category);
	const fromSymbol = options.find((unit) => unit.id === from)?.symbol ?? from;
	const toSymbol = options.find((unit) => unit.id === to)?.symbol ?? to;

	const numeric = Number(value);
	const valid = value.trim() !== "" && Number.isFinite(numeric);
	const converted = valid ? convertUnit(category, numeric, from, to) : null;
	const resultText =
		converted === null ? "" : formatUnitValue(converted, locale);

	const rows = useMemo(() => {
		return options.map((unit) => {
			if (!valid) {
				return { ...unit, text: "" };
			}
			return {
				...unit,
				text: formatUnitValue(
					convertUnit(category, numeric, from, unit.id),
					locale,
				),
			};
		});
	}, [options, valid, numeric, category, from, locale]);

	const switchCategory = (next: string) => {
		const target = next as UnitCategory;
		const pair = DEFAULT_UNITS[target];
		setCategory(target);
		setValue("1");
		setFrom(pair[0]);
		setTo(pair[1]);
		setCopyState("idle");
	};

	const swap = () => {
		setFrom(to);
		setTo(from);
		setCopyState("idle");
	};

	const copyResult = async () => {
		if (!valid) {
			return;
		}
		try {
			await navigator.clipboard.writeText(`${resultText} ${toSymbol}`);
			setCopyState("copied");
		} catch {
			setCopyState("failed");
		}
	};

	const categoryLabel = t(`options.${category}`);

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<TabsRoot onValueChange={switchCategory} value={category}>
				<TabsList
					className="grid grid-cols-4 gap-1 lg:grid-cols-8"
					variant="segment"
				>
					{UNIT_CATEGORIES.map((entry) => (
						<TabsTab
							className={`${tabActiveClass} flex-none px-1 text-center text-xs leading-tight`}
							key={entry}
							value={entry}
						>
							{t(`options.${entry}`)}
						</TabsTab>
					))}
					<TabsIndicator />
				</TabsList>
			</TabsRoot>

			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
				<div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<Field>
						<FieldLabel htmlFor="unit-value">{t("options.value")}</FieldLabel>
						<Input
							aria-invalid={valid ? undefined : true}
							className={inputClass}
							data-testid="unit-value"
							id="unit-value"
							inputMode="decimal"
							onChange={(event) => {
								setValue(event.target.value);
								setCopyState("idle");
							}}
							type="text"
							value={value}
						/>
						{valid ? null : (
							<p className="text-small text-error" role="alert">
								{t("options.invalid")}
							</p>
						)}
					</Field>

					<div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
						<Field>
							<FieldLabel htmlFor="unit-from">{t("options.from")}</FieldLabel>
							<Select
								aria-label={t("options.from")}
								className={selectTriggerClass}
								data-testid="unit-from"
								id="unit-from"
								onValueChange={(next) => {
									setFrom(next);
									setCopyState("idle");
								}}
								options={options.map((unit) => ({
									label: unit.symbol,
									value: unit.id,
								}))}
								value={from}
							/>
						</Field>
						<SmoothButton
							aria-label={t("options.swap")}
							className="w-full sm:mb-0 sm:w-auto"
							data-testid="unit-swap"
							onClick={swap}
							size="sm"
							variant="secondary"
						>
							<ArrowRightLeft
								aria-hidden="true"
								className="size-4 rtl:rotate-180"
							/>
							<span className="sm:sr-only">{t("options.swap")}</span>
						</SmoothButton>
						<Field>
							<FieldLabel htmlFor="unit-to">{t("options.to")}</FieldLabel>
							<Select
								aria-label={t("options.to")}
								className={selectTriggerClass}
								data-testid="unit-to"
								id="unit-to"
								onValueChange={(next) => {
									setTo(next);
									setCopyState("idle");
								}}
								options={options.map((unit) => ({
									label: unit.symbol,
									value: unit.id,
								}))}
								value={to}
							/>
						</Field>
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 md:p-6">
					<p className="eyebrow text-text-3">{t("options.result")}</p>
					<p
						className="font-display text-h1 tabular-nums break-words"
						data-testid="unit-result"
					>
						{resultText ? (
							<span className="inline-flex items-baseline gap-2" dir="ltr">
								<span>{resultText}</span>
								<span className="text-h3 text-text-2">{toSymbol}</span>
							</span>
						) : null}
					</p>
					<p className="text-small text-text-2">
						{valid ? (
							<span dir="ltr">
								{`${formatUnitValue(numeric, locale)} ${fromSymbol} = ${resultText} ${toSymbol}`}
							</span>
						) : (
							t("options.invalid")
						)}
					</p>
					<SmoothButton
						disabled={!valid}
						onClick={copyResult}
						size="sm"
						variant="secondary"
					>
						{copyState === "copied" ? (
							<Check aria-hidden="true" className="size-4" />
						) : (
							<Copy aria-hidden="true" className="size-4" />
						)}
						{copyState === "copied" ? t("options.copied") : t("options.copy")}
					</SmoothButton>
					{copyState === "failed" ? (
						<p className="text-small text-error" role="alert">
							{t("options.copyFailed")}
						</p>
					) : null}
				</div>
			</div>

			<div className="rounded-lg border border-border bg-surface p-5 md:p-6">
				<h2 className="mb-3 text-h3">
					{t("options.allUnits", { category: categoryLabel })}
				</h2>
				<table className="w-full text-small">
					<thead>
						<tr className="border-border border-b">
							<th className="eyebrow py-2 text-start text-text-3" scope="col">
								{t("options.unit")}
							</th>
							<th className="eyebrow py-2 text-end text-text-3" scope="col">
								{t("options.value")}
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((unit) => (
							<tr
								className={
									unit.id === to
										? "border-border border-b bg-surface-2 last:border-b-0"
										: "border-border border-b last:border-b-0"
								}
								data-testid={`unit-row-${unit.id}`}
								key={unit.id}
							>
								<td className="py-2 pe-3">{unit.symbol}</td>
								<td className="py-2 text-end font-display tabular-nums">
									{unit.text || "-"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<p className="mt-3 text-caption text-text-3">{t("options.note")}</p>
				{category === "time" ? (
					<p className="text-caption text-text-3">{t("options.averageNote")}</p>
				) : null}
			</div>

			<p className="text-caption text-text-3">{tc("filesNeverLeave")}</p>
		</div>
	);
}
