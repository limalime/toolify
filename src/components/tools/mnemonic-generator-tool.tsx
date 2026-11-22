"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Alert from "@/components/smoothui/alert";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import Textarea from "@/components/smoothui/textarea";
import {
	inputClass,
	selectTriggerClass,
	tabActiveClass,
} from "@/lib/control-classes";
import {
	checkMnemonic,
	deriveAddress,
	newMnemonic,
	WALLET_COINS,
	WALLET_PURPOSES,
	type WalletCoin,
	type WalletPurpose,
} from "@/lib/others/wallet";
import { copyText } from "@/lib/text/clipboard";

interface Derived {
	address: string;
	path: string;
	publicKey: string;
}

export default function MnemonicGeneratorTool() {
	const t = useTranslations("tools.mnemonic-generator");
	const tc = useTranslations("common");
	const [words, setWords] = useState<"12" | "24">("12");
	const [mnemonic, setMnemonic] = useState("");
	const [coin, setCoin] = useState<WalletCoin>("BTC");
	const [purpose, setPurpose] = useState<WalletPurpose>(84);
	const [account, setAccount] = useState("0");
	const [change, setChange] = useState("0");
	const [index, setIndex] = useState("0");
	const [error, setError] = useState<string | null>(null);
	const [derived, setDerived] = useState<Derived | null>(null);

	const resetResult = () => {
		setDerived(null);
		setError(null);
	};

	const generate = () => {
		setError(null);
		setDerived(null);
		setMnemonic(newMnemonic(words === "12" ? 12 : 24));
	};

	const derive = () => {
		setError(null);
		setDerived(null);
		if (!checkMnemonic(mnemonic)) {
			setError(t("options.invalid"));
			return;
		}
		const numbers = [account, change, index].map((value) =>
			Number.parseInt(value, 10),
		);
		if (numbers.some((value) => !Number.isInteger(value) || value < 0)) {
			setError(t("options.invalid"));
			return;
		}
		try {
			const result = deriveAddress(mnemonic, {
				coin,
				purpose: coin === "ETH" ? 44 : purpose,
				account: numbers[0] as number,
				change: numbers[1] as number,
				index: numbers[2] as number,
			});
			setDerived(result);
		} catch {
			setError(t("options.invalid"));
		}
	};

	const copy = async (value: string) => {
		if (await copyText(value)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), value.slice(0, 64));
		}
	};

	return (
		<div className="flex min-w-0 flex-col gap-4">
			<Alert icon={<TriangleAlert />} role="note" variant="warning">
				{t("options.warning")}
			</Alert>
			<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
				<div className="flex min-w-0 flex-col gap-4">
					<Field>
						<FieldLabel htmlFor="mnemonic-words">
							{t("options.mnemonic")}
						</FieldLabel>
						<Textarea
							className="border-border bg-surface-2"
							id="mnemonic-words"
							onChange={(event) => {
								setMnemonic(event.target.value);
								setDerived(null);
								setError(null);
							}}
							rows={3}
							value={mnemonic}
						/>
					</Field>
					<p className="text-small text-text-2">{t("options.pasteHint")}</p>
					{error ? (
						<p className="text-small text-error" role="alert">
							{error}
						</p>
					) : null}
					{derived ? (
						<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
							<div className="flex flex-col gap-1">
								<span className="text-small font-medium text-text-2">
									{t("options.address")}
								</span>
								<code
									className="font-mono text-small break-all"
									data-testid="derived-address"
								>
									{derived.address}
								</code>
								<SmoothButton
									onClick={() => copy(derived.address)}
									size="sm"
									variant="secondary"
								>
									{tc("copy")}
								</SmoothButton>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-small font-medium text-text-2">
									{t("options.path")}
								</span>
								<code className="font-mono text-small">{derived.path}</code>
							</div>
							<div className="flex flex-col gap-1">
								<span className="text-small font-medium text-text-2">
									{t("options.publicKey")}
								</span>
								<code className="font-mono text-small break-all">
									{derived.publicKey}
								</code>
							</div>
						</div>
					) : (
						<p className="text-small text-text-2">{t("options.emptyHint")}</p>
					)}
				</div>
				<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
					<TabsRoot
						defaultValue="12"
						onValueChange={(value) => setWords(value as "12" | "24")}
					>
						<TabsList aria-label={t("options.words")}>
							<TabsTab className={tabActiveClass} value="12">
								{t("options.words12")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="24">
								{t("options.words24")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
					<SmoothButton onClick={generate} size="lg" variant="secondary">
						{t("options.generate")}
					</SmoothButton>
					<Field>
						<FieldLabel htmlFor="mnemonic-coin">{t("options.coin")}</FieldLabel>
						<Select
							aria-label={t("options.coin")}
							className={selectTriggerClass}
							id="mnemonic-coin"
							onValueChange={(value) => {
								setCoin(value as WalletCoin);
								resetResult();
							}}
							options={WALLET_COINS.map((item) => ({
								label: item,
								value: item,
							}))}
							value={coin}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="mnemonic-purpose">
							{t("options.purpose")}
						</FieldLabel>
						<Select
							aria-label={t("options.purpose")}
							className={selectTriggerClass}
							disabled={coin === "ETH"}
							id="mnemonic-purpose"
							onValueChange={(value) => {
								setPurpose(Number(value) as WalletPurpose);
								resetResult();
							}}
							options={WALLET_PURPOSES.map((item) => ({
								label: String(item),
								value: String(item),
							}))}
							value={coin === "ETH" ? "44" : String(purpose)}
						/>
					</Field>
					<div className="grid grid-cols-3 gap-3">
						<Field>
							<FieldLabel htmlFor="mnemonic-account">
								{t("options.account")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="mnemonic-account"
								inputMode="numeric"
								onChange={(event) => {
									setAccount(event.target.value);
									resetResult();
								}}
								type="number"
								value={account}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="mnemonic-change">
								{t("options.change")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="mnemonic-change"
								inputMode="numeric"
								onChange={(event) => {
									setChange(event.target.value);
									resetResult();
								}}
								type="number"
								value={change}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="mnemonic-index">
								{t("options.index")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="mnemonic-index"
								inputMode="numeric"
								onChange={(event) => {
									setIndex(event.target.value);
									resetResult();
								}}
								type="number"
								value={index}
							/>
						</Field>
					</div>
					<SmoothButton className="w-full" onClick={derive} size="lg">
						{t("options.derive")}
					</SmoothButton>
				</div>
			</div>
		</div>
	);
}
