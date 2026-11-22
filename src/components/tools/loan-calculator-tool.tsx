"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useToolCompleted } from "@/components/analytics/use-tool-completed";
import Alert from "@/components/smoothui/alert";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import { inputClass } from "@/lib/control-classes";
import { amortizationSchedule, loanSummary } from "@/lib/finance/loan";

export default function LoanCalculatorTool() {
	const t = useTranslations("tools.loan-calculator");
	const locale = useLocale();
	const [amountInput, setAmountInput] = useState("300000");
	const [rateInput, setRateInput] = useState("6");
	const [yearsInput, setYearsInput] = useState("30");

	const amount = Number(amountInput);
	const rate = Number(rateInput);
	const years = Number(yearsInput);
	const months = Math.round(years * 12);
	const valid =
		amountInput.trim() !== "" &&
		rateInput.trim() !== "" &&
		yearsInput.trim() !== "" &&
		Number.isFinite(amount) &&
		amount > 0 &&
		Number.isFinite(rate) &&
		rate >= 0 &&
		Number.isFinite(years) &&
		years > 0 &&
		months >= 1 &&
		months <= 600;

	useToolCompleted(valid);

	const summary = useMemo(
		() => loanSummary(amount, rate, months),
		[amount, rate, months],
	);
	const rows = useMemo(
		() => amortizationSchedule(amount, rate, months),
		[amount, rate, months],
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
		{ key: "payment", value: summary.payment },
		{ key: "totalInterest", value: summary.totalInterest },
		{ key: "totalPaid", value: summary.totalPaid },
	];

	return (
		<div className="flex min-w-0 flex-col gap-6">
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<Field>
						<FieldLabel htmlFor="loan-amount">{t("options.amount")}</FieldLabel>
						<Input
							className={inputClass}
							data-testid="loan-amount"
							id="loan-amount"
							inputMode="decimal"
							min="0"
							onChange={(event) => setAmountInput(event.target.value)}
							step="any"
							type="number"
							value={amountInput}
						/>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor="loan-rate">{t("options.rate")}</FieldLabel>
							<Input
								className={inputClass}
								data-testid="loan-rate"
								id="loan-rate"
								inputMode="decimal"
								min="0"
								onChange={(event) => setRateInput(event.target.value)}
								step="any"
								type="number"
								value={rateInput}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="loan-years">{t("options.years")}</FieldLabel>
							<Input
								className={inputClass}
								data-testid="loan-years"
								id="loan-years"
								inputMode="decimal"
								min="0"
								onChange={(event) => setYearsInput(event.target.value)}
								step="any"
								type="number"
								value={yearsInput}
							/>
						</Field>
					</div>
					{!valid ? (
						<Alert variant="warning">{t("options.invalid")}</Alert>
					) : null}
					<p className="text-small text-text-2">{t("options.localNote")}</p>
				</div>
				<dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
					{stats.map((stat, index) => (
						<div
							className={`rounded-lg border border-border bg-surface p-4 ${
								index === 0 ? "col-span-2 lg:col-span-1" : ""
							}`}
							data-testid={`loan-${stat.key}`}
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
			{valid ? (
				<section className="flex flex-col gap-3">
					<h2 className="text-h3">{t("options.schedule")}</h2>
					<div className="max-h-96 overflow-auto rounded-lg border border-border bg-surface">
						<table
							className="w-full text-small tabular-nums"
							data-testid="loan-table"
						>
							<caption className="sr-only">{t("options.schedule")}</caption>
							<thead className="sticky top-0 bg-surface-2">
								<tr>
									<th className="px-3 py-2 text-start font-medium">
										{t("options.month")}
									</th>
									<th className="px-3 py-2 text-end font-medium">
										{t("options.payment")}
									</th>
									<th className="px-3 py-2 text-end font-medium">
										{t("options.interest")}
									</th>
									<th className="px-3 py-2 text-end font-medium">
										{t("options.principal")}
									</th>
									<th className="px-3 py-2 text-end font-medium">
										{t("options.balance")}
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => (
									<tr className="border-border border-t" key={row.period}>
										<td className="px-3 py-2">{row.period}</td>
										<td className="px-3 py-2 text-end">
											{numberFormat.format(row.payment)}
										</td>
										<td className="px-3 py-2 text-end">
											{numberFormat.format(row.interest)}
										</td>
										<td className="px-3 py-2 text-end">
											{numberFormat.format(row.principal)}
										</td>
										<td className="px-3 py-2 text-end">
											{numberFormat.format(row.balance)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			) : null}
		</div>
	);
}
