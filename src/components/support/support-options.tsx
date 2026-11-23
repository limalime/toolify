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

const CRYPTO: Record<
	"btc" | "eth" | "solana",
	{ address: string; network: string }
> = {
	btc: { address: "[MING] BTC address", network: "Bitcoin" },
	eth: {
		address: "[MING] ETH and EVM address",
		network: "Ethereum, Base, Polygon, BNB Chain",
	},
	solana: { address: "[MING] Solana address", network: "Solana" },
};

export default function SupportOptions() {
	const t = useTranslations("support");
	const [channel, setChannel] = useState<Channel>("kofi");
	const [copied, setCopied] = useState(false);

	const copy = async (address: string) => {
		if (address.startsWith("[MING]")) {
			notify.warning(t("notReady"));
			return;
		}
		try {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			notify.success(t("copied"));
			setTimeout(() => setCopied(false), 2000);
		} catch {
			notify.error(t("copyFailed"), address);
		}
	};

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
						setCopied(false);
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

			{channel === "btc" || channel === "eth" || channel === "solana" ? (
				<section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<div className="flex flex-col gap-1">
						<h2 className="font-display text-h3">
							{t(`crypto.${channel}.title`)}
						</h2>
						<p className="text-small text-text-2">
							{CRYPTO[channel].network}
						</p>
					</div>
					<div className="flex flex-col gap-2">
						<span className="text-caption uppercase tracking-wide text-text-3">
							{t("address")}
						</span>
						<code
							className="block break-all rounded-lg border border-border bg-surface-2 p-3 font-mono text-small text-text"
							dir="ltr"
						>
							{CRYPTO[channel].address}
						</code>
						<p className="text-small text-warning">{t("notReady")}</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<SmoothButton
							onClick={() => copy(CRYPTO[channel].address)}
							size="lg"
							variant="candy"
						>
							{copied ? (
								<Check aria-hidden="true" className="size-4" />
							) : (
								<Copy aria-hidden="true" className="size-4" />
							)}
							{copied ? t("copied") : t("copy")}
						</SmoothButton>
					</div>
				</section>
			) : null}

			<p className="text-small text-text-3">{t("note")}</p>
		</div>
	);
}