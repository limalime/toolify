"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { selectTriggerClass } from "@/lib/control-classes";

type Channel = "kofi" | "paypal" | "btc" | "eth" | "solana";

const OPTIONS: Channel[] = ["kofi", "paypal", "btc", "eth", "solana"];

const KOFI_URL = "https://ko-fi.com/usetoolify";
const KOFI_EMBED =
	"https://ko-fi.com/usetoolify/?hidefeed=true&widget=true&embed=true&preview=true";
const PAYPAL_URL = "https://paypal.me/usetoolify";

const BTC_ADDRESSES = [
	{
		key: "taproot",
		address: "bc1p8dpfqaj5xrzm2x2ccc9rj0d4u636tvag4yy50f2mcdp2t7q43fzq4lnx20",
	},
	{
		key: "legacy",
		address: "1PLwr1PmV8RAjjdZg9vFfjUnhSuWTKYNPb",
	},
] as const;

const EVM_ADDRESS = "0xf253589c90a9d9C58EfC613Ef405c3DD343F59e0";
const SOLANA_ADDRESS = "5dCoouEXCbCE7s6ChvRWNTy6Lu4d9ZF2oLWQiM9DY6tx";

export default function SupportOptions() {
	const t = useTranslations("support");
	const [channel, setChannel] = useState<Channel>("kofi");
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const copy = async (address: string, key: string) => {
		try {
			await navigator.clipboard.writeText(address);
			setCopiedKey(key);
			notify.success(t("copied"));
			setTimeout(() => setCopiedKey(null), 2000);
		} catch {
			notify.error(t("copyFailed"), address);
		}
	};

	const addressBlock = (key: string, label: string, address: string) => (
		<div className="flex flex-col gap-2" key={key}>
			<span className="text-caption uppercase tracking-wide text-text-3">
				{label}
			</span>
			<code
				className="block break-all rounded-lg border border-border bg-surface-2 p-3 font-mono text-small text-text"
				dir="ltr"
			>
				{address}
			</code>
			<div className="flex flex-wrap gap-2">
				<SmoothButton
					onClick={() => copy(address, key)}
					size="lg"
					variant="candy"
				>
					{copiedKey === key ? (
						<Check aria-hidden="true" className="size-4" />
					) : (
						<Copy aria-hidden="true" className="size-4" />
					)}
					{copiedKey === key ? t("copied") : t("copy")}
				</SmoothButton>
			</div>
		</div>
	);

	return (
		<div className="flex flex-col gap-5">
			<Field>
				<FieldLabel htmlFor="support-channel">{t("options.label")}</FieldLabel>
				<Select
					aria-label={t("options.label")}
					className={selectTriggerClass}
					id="support-channel"
					onValueChange={(value) => {
						setChannel(value as Channel);
						setCopiedKey(null);
					}}
					options={OPTIONS.map((entry) => ({
						label: t(`options.${entry}`),
						value: entry,
					}))}
					value={channel}
				/>
			</Field>

			{channel === "kofi" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">{t("kofiTitle")}</h2>
						<p className="text-small text-text-2">{t("kofiLine")}</p>
					</div>
					<div className="overflow-hidden rounded-lg border border-border bg-white p-1">
						<iframe
							allow="payment"
							className="block h-[560px] w-full rounded-md border-0 bg-white"
							loading="lazy"
							src={KOFI_EMBED}
							title={t("kofiTitle")}
						/>
					</div>
					<SmoothButton asChild className="w-fit" size="lg" variant="candy">
						<a href={KOFI_URL} rel="noopener noreferrer" target="_blank">
							{t("kofiOpen")}
							<ExternalLink aria-hidden="true" className="size-4" />
						</a>
					</SmoothButton>
				</section>
			) : null}

			{channel === "paypal" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">{t("paypalTitle")}</h2>
						<p className="text-small text-text-2">{t("paypalLine")}</p>
					</div>
					<SmoothButton asChild className="w-fit" size="lg" variant="candy">
						<a href={PAYPAL_URL} rel="noopener noreferrer" target="_blank">
							{t("paypalOpen")}
							<ExternalLink aria-hidden="true" className="size-4" />
						</a>
					</SmoothButton>
				</section>
			) : null}

			{channel === "btc" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">{t("crypto.btc.title")}</h2>
						<p className="text-small text-text-2">{t("crypto.btc.network")}</p>
					</div>
					{BTC_ADDRESSES.map((entry) =>
						addressBlock(
							entry.key,
							t(`crypto.btc.${entry.key}`),
							entry.address,
						),
					)}
				</section>
			) : null}

			{channel === "eth" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">{t("crypto.eth.title")}</h2>
						<p className="text-small text-text-2">{t("crypto.eth.network")}</p>
					</div>
					{addressBlock("eth", t("address"), EVM_ADDRESS)}
				</section>
			) : null}

			{channel === "solana" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">{t("crypto.solana.title")}</h2>
						<p className="text-small text-text-2">
							{t("crypto.solana.network")}
						</p>
					</div>
					{addressBlock("solana", t("address"), SOLANA_ADDRESS)}
				</section>
			) : null}

			<p className="text-small text-text-3">{t("note")}</p>
		</div>
	);
}
