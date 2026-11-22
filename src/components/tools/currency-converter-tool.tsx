"use client";

import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useToolCompleted } from "@/components/analytics/use-tool-completed";
import Alert from "@/components/smoothui/alert";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import {
	CURRENCIES,
	convertCurrency,
	formatMoney,
	formatRate,
	formatRateDate,
	isCacheFresh,
	parseRatesPayload,
	type RateTable,
	ratesUrl,
	readRateCache,
	writeRateCache,
} from "@/lib/finance/currency";

type Status = "loading" | "ready" | "error";

export default function CurrencyConverterTool() {
	const t = useTranslations("tools.currency-converter");
	const locale = useLocale();
	const [amount, setAmount] = useState("100");
	const [from, setFrom] = useState("USD");
	const [to, setTo] = useState("EUR");
	const [table, setTable] = useState<RateTable | null>(null);
	const [status, setStatus] = useState<Status>("loading");
	const [stale, setStale] = useState(false);
	const [reload, setReload] = useState(0);

	// the retry counter is not read inside the effect, it exists to rerun it
	// biome-ignore lint/correctness/useExhaustiveDependencies: retry counter
	useEffect(() => {
		let live = true;
		const controller = new AbortController();
		const storage = window.localStorage;
		const cached = readRateCache(from, storage);

		if (cached && isCacheFresh(cached, Date.now())) {
			setTable(cached);
			setStale(false);
			setStatus("ready");
			return () => {
				live = false;
				controller.abort();
			};
		}

		setTable(null);
		setStale(false);
		setStatus("loading");

		fetch(ratesUrl(from), { signal: controller.signal })
			.then((response) => {
				if (!response.ok) {
					throw new Error("rate request failed");
				}
				return response.json();
			})
			.then((payload: unknown) => {
				const parsed = parseRatesPayload(payload, from);
				const next: RateTable = {
					base: from,
					date: parsed.date,
					rates: parsed.rates,
					fetchedAt: Date.now(),
				};
				writeRateCache(next, storage);
				if (!live) {
					return;
				}
				setTable(next);
				setStale(false);
				setStatus("ready");
			})
			.catch(() => {
				if (!live) {
					return;
				}
				if (cached) {
					setTable(cached);
					setStale(true);
					setStatus("ready");
					return;
				}
				setTable(null);
				setStatus("error");
			});

		return () => {
			live = false;
			controller.abort();
		};
	}, [from, reload]);

	const options = useMemo(() => {
		let names: Intl.DisplayNames | null = null;
		try {
			names = new Intl.DisplayNames([locale], { type: "currency" });
		} catch {
			names = null;
		}
		return CURRENCIES.map((code) => ({
			label: `${code} - ${names?.of(code) ?? code}`,
			value: code,
		}));
	}, [locale]);

	const numericAmount = Number(amount);
	const amountValid =
		amount.trim() !== "" &&
		Number.isFinite(numericAmount) &&
		numericAmount >= 0;

	let converted: number | null = null;
	let unitRate: number | null = null;
	if (table && amountValid) {
		try {
			converted = convertCurrency(numericAmount, from, to, table);
		} catch {
			converted = null;
		}
		try {
			unitRate = convertCurrency(1, from, to, table);
		} catch {
			unitRate = null;
		}
	}

	useToolCompleted(converted !== null);

	const swap = () => {
		setFrom(to);
		setTo(from);
	};

	return (
		<div className="grid min-w-0 gap-6 lg:grid-cols-2">
			<div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="fx-amount">{t("options.amount")}</FieldLabel>
					<Input
						className={inputClass}
						data-testid="fx-amount"
						id="fx-amount"
						inputMode="decimal"
						min="0"
						onChange={(event) => setAmount(event.target.value)}
						step="any"
						type="number"
						value={amount}
					/>
				</Field>
				<div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
					<Field>
						<FieldLabel htmlFor="fx-from">{t("options.from")}</FieldLabel>
						<Select
							aria-label={t("options.from")}
							className={selectTriggerClass}
							data-testid="fx-from"
							id="fx-from"
							onValueChange={setFrom}
							options={options}
							value={from}
						/>
					</Field>
					<SmoothButton
						aria-label={t("options.swap")}
						className="justify-self-center"
						data-testid="fx-swap"
						onClick={swap}
						size="icon-lg"
						type="button"
						variant="outline"
					>
						<ArrowRightLeft className="size-5 rtl:rotate-180" />
					</SmoothButton>
					<Field>
						<FieldLabel htmlFor="fx-to">{t("options.to")}</FieldLabel>
						<Select
							aria-label={t("options.to")}
							className={selectTriggerClass}
							data-testid="fx-to"
							id="fx-to"
							onValueChange={setTo}
							options={options}
							value={to}
						/>
					</Field>
				</div>
				{!amountValid ? (
					<p className="text-small text-destructive-ink">
						{t("options.invalid")}
					</p>
				) : null}
				<p className="text-small text-text-2">{t("options.localNote")}</p>
			</div>

			<div className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<span className="text-small font-medium text-text-2">
					{t("options.result")}
				</span>
				<output
					aria-live="polite"
					className="font-display text-h2 tabular-nums break-words"
					data-testid="fx-result"
				>
					{converted === null ? "" : formatMoney(converted, to, locale)}
				</output>
				{unitRate !== null ? (
					<p className="text-small tabular-nums text-text-2">
						<span dir="ltr">
							{t("options.rateLine", {
								from,
								rate: formatRate(unitRate, locale),
								to,
							})}
						</span>
					</p>
				) : null}
				{status === "loading" ? (
					<p className="text-small text-text-2" role="status">
						{t("options.loading")}
					</p>
				) : null}
				{table ? (
					<p className="text-small text-text-2" data-testid="fx-rate-date">
						{t("options.rateDate", {
							date: formatRateDate(table.date, locale),
						})}
					</p>
				) : null}
				{stale && table ? (
					<Alert
						data-testid="fx-stale"
						title={t("options.staleTitle")}
						variant="warning"
					>
						{t("options.staleBody", {
							date: formatRateDate(table.date, locale),
						})}
					</Alert>
				) : null}
				{status === "error" ? (
					<Alert
						data-testid="fx-error"
						title={t("options.errorTitle")}
						variant="destructive"
					>
						<div className="flex flex-col items-start gap-3">
							<span>{t("options.errorBody")}</span>
							<SmoothButton
								onClick={() => setReload((value) => value + 1)}
								size="sm"
								type="button"
								variant="outline"
							>
								<RefreshCw className="size-4" />
								{t("options.retry")}
							</SmoothButton>
						</div>
					</Alert>
				) : null}
			</div>
		</div>
	);
}
