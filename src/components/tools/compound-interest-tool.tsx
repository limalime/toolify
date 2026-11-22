"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import Alert from "@/components/smoothui/alert";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import Select from "@/components/smoothui/select";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import {
	COMPOUND_FREQUENCIES,
	type CompoundFrequency,
	type CompoundPoint,
	compoundSchedule,
	compoundSummary,
} from "@/lib/finance/compound";
import { formatCompact } from "@/lib/format";

function GrowthChart({
	label,
	points,
}: {
	label: string;
	points: CompoundPoint[];
}) {
	const width = 640;
	const height = 260;
	const padX = 16;
	const padTop = 18;
	const padBottom = 30;
	const max = Math.max(...points.map((point) => point.balance), 1);
	const innerWidth = width - padX * 2;
	const innerHeight = height - padTop - padBottom;
	const lastYear = points[points.length - 1]?.year ?? 1;
	const span = lastYear > 0 ? lastYear : 1;
	const coords = points.map((point) => ({
		x: padX + (point.year / span) * innerWidth,
		y: padTop + (1 - point.balance / max) * innerHeight,
	}));
	const line = coords
		.map(
			(point, index) =>
				`${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
		)
		.join(" ");
	const first = coords[0];
	const last = coords[coords.length - 1];
	const baseline = padTop + innerHeight;
	const area = `${line} L${last.x.toFixed(2)},${baseline} L${first.x.toFixed(2)},${baseline} Z`;
	const ticks = [0, 0.5, 1].map((share) => ({
		value: max * share,
		y: padTop + (1 - share) * innerHeight,
	}));
	const yearIndexes =
		points.length > 2
			? [0, Math.floor((points.length - 1) / 2), points.length - 1]
			: [0, points.length - 1];

	return (
		<div
			className="mx-auto w-full max-w-2xl rounded-lg border border-border bg-surface p-4 md:p-5"
			dir="ltr"
		>
			<svg
				aria-label={label}
				className="h-auto w-full"
				data-testid="compound-chart"
				role="img"
				viewBox={`0 0 ${width} ${height}`}
			>
				<title>{label}</title>
				{ticks.map((tick) => (
					<g key={tick.y}>
						<line
							className="text-border"
							stroke="currentColor"
							strokeDasharray="3 5"
							strokeWidth={1}
							x1={padX}
							x2={width - padX}
							y1={tick.y}
							y2={tick.y}
						/>
						<text
							className="fill-text-3 text-[18px] md:text-[10px]"
							x={padX}
							y={tick.y - 4}
						>
							{formatCompact(tick.value)}
						</text>
					</g>
				))}
				<path className="fill-blue-500/15" d={area} />
				<path
					className="fill-none stroke-blue-500"
					d={line}
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2.5}
				/>
				{yearIndexes.map((index) => {
					const point = points[index];
					const coord = coords[index];
					if (!point || !coord) {
						return null;
					}
					const anchor =
						index === 0
							? "start"
							: index === points.length - 1
								? "end"
								: "middle";
					return (
						<text
							className="fill-text-3 text-[18px] md:text-[10px]"
							key={index}
							textAnchor={anchor}
							x={coord.x}
							y={height - 8}
						>
							{point.year}
						</text>
					);
				})}
			</svg>
		</div>
	);
}

export default function CompoundInterestTool() {
	const t = useTranslations("tools.compound-interest");
	const locale = useLocale();
	const [principalInput, setPrincipalInput] = useState("10000");
	const [rateInput, setRateInput] = useState("7");
	const [yearsInput, setYearsInput] = useState("10");
	const [frequency, setFrequency] = useState<CompoundFrequency>("monthly");

	const principal = Number(principalInput);
	const rate = Number(rateInput);
	const years = Number(yearsInput);
	const valid =
		principalInput.trim() !== "" &&
		rateInput.trim() !== "" &&
		yearsInput.trim() !== "" &&
		Number.isFinite(principal) &&
		principal > 0 &&
		Number.isFinite(rate) &&
		rate >= 0 &&
		Number.isFinite(years) &&
		years > 0;

	const summary = useMemo(
		() => compoundSummary(principal, rate, years, frequency),
		[principal, rate, years, frequency],
	);
	const points = useMemo(
		() => compoundSchedule(principal, rate, years, frequency),
		[principal, rate, years, frequency],
	);

	const numberFormat = useMemo(
		() =>
			new Intl.NumberFormat(locale, {
				maximumFractionDigits: 2,
				minimumFractionDigits: 2,
			}),
		[locale],
	);

	const stats = [
		{ key: "finalBalance", value: summary.finalBalance },
		{ key: "totalInterest", value: summary.totalInterest },
		{ key: "principal", value: summary.principal },
	];

	return (
		<div className="flex min-w-0 flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<Field>
						<FieldLabel htmlFor="compound-principal">
							{t("options.principal")}
						</FieldLabel>
						<Input
							className={inputClass}
							data-testid="compound-principal"
							id="compound-principal"
							inputMode="decimal"
							min="0"
							onChange={(event) => setPrincipalInput(event.target.value)}
							step="any"
							type="number"
							value={principalInput}
						/>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor="compound-rate">
								{t("options.rate")}
							</FieldLabel>
							<Input
								className={inputClass}
								data-testid="compound-rate"
								id="compound-rate"
								inputMode="decimal"
								min="0"
								onChange={(event) => setRateInput(event.target.value)}
								step="any"
								type="number"
								value={rateInput}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="compound-years">
								{t("options.years")}
							</FieldLabel>
							<Input
								className={inputClass}
								data-testid="compound-years"
								id="compound-years"
								inputMode="decimal"
								min="0"
								onChange={(event) => setYearsInput(event.target.value)}
								step="any"
								type="number"
								value={yearsInput}
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor="compound-frequency">
							{t("options.frequency")}
						</FieldLabel>
						<Select
							aria-label={t("options.frequency")}
							className={selectTriggerClass}
							id="compound-frequency"
							onValueChange={(value) =>
								setFrequency(value as CompoundFrequency)
							}
							options={COMPOUND_FREQUENCIES.map((item) => ({
								label: t(`options.${item}`),
								value: item,
							}))}
							value={frequency}
						/>
					</Field>
					{!valid ? (
						<Alert variant="warning">{t("options.invalid")}</Alert>
					) : null}
				</div>
				<div className="flex flex-col gap-4">
					<dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
						{stats.map((stat, index) => (
							<div
								className={`rounded-lg border border-border bg-surface p-4 ${
									index === 0 ? "col-span-2 lg:col-span-1" : ""
								}`}
								data-testid={`compound-stat-${stat.key}`}
								key={stat.key}
							>
								<dt className="text-small font-medium text-text-2">
									{t(`options.${stat.key}`)}
								</dt>
								<dd className="font-display text-h3 tabular-nums break-words sm:text-h2">
									{valid ? numberFormat.format(stat.value) : "0.00"}
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
			{valid ? (
				<>
					<GrowthChart
						label={t("options.chartLabel", { years })}
						points={points}
					/>
					<details className="rounded-lg border border-border bg-surface">
						<summary className="cursor-pointer px-4 py-3 text-small font-medium outline-none focus-visible:text-blue-500">
							{t("options.schedule")}
						</summary>
						<div className="max-h-72 overflow-auto">
							<table className="w-full text-small tabular-nums">
								<thead className="sticky top-0 bg-surface-2 text-start">
									<tr>
										<th className="px-4 py-2 text-start font-medium">
											{t("options.year")}
										</th>
										<th className="px-4 py-2 text-end font-medium">
											{t("options.balance")}
										</th>
									</tr>
								</thead>
								<tbody>
									{points.map((point) => (
										<tr className="border-border border-t" key={point.year}>
											<td className="px-4 py-2">{point.year}</td>
											<td className="px-4 py-2 text-end">
												{numberFormat.format(point.balance)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</details>
				</>
			) : null}
		</div>
	);
}
