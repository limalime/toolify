"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import {
	generatePassword,
	type PasswordSets,
	passwordEntropyBits,
	passwordPool,
	passwordStrength,
} from "@/lib/others/password";
import { copyText } from "@/lib/text/clipboard";

const SET_KEYS: Array<keyof PasswordSets> = [
	"lower",
	"upper",
	"digits",
	"symbols",
];

export default function PasswordGeneratorTool() {
	const t = useTranslations("tools.password-generator");
	const tc = useTranslations("common");
	const [length, setLength] = useState(20);
	const [sets, setSets] = useState<PasswordSets>({
		lower: true,
		upper: true,
		digits: true,
		symbols: true,
	});
	const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
	const [password, setPassword] = useState("");
	const [bits, setBits] = useState(0);

	const pool = useMemo(
		() => passwordPool(sets, excludeAmbiguous),
		[sets, excludeAmbiguous],
	);
	const previewBits = passwordEntropyBits(length, pool.length);
	const strength = passwordStrength(bits);

	const generate = () => {
		if (!pool) {
			return;
		}
		setPassword(generatePassword(length, pool));
		setBits(previewBits);
	};

	const copy = async () => {
		if (!password) {
			return;
		}
		if (await copyText(password)) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), password.slice(0, 64));
		}
	};

	const strengthPercent = Math.min(100, Math.round((bits / 128) * 100));

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="order-2 flex min-w-0 flex-col gap-4 lg:order-1">
				{password ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
						<code
							className="font-mono text-h3 break-all"
							data-testid="password-output"
						>
							{password}
						</code>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<span
									className="text-small text-text-2"
									data-testid="password-strength"
								>
									{t(
										`options.strength${strength[0]?.toUpperCase()}${strength.slice(1)}`,
									)}
								</span>
								<span className="font-display text-small tabular-nums text-text-2">
									{t("options.entropy", { bits })}
								</span>
							</div>
							<ProgressRoot
								value={strengthPercent}
								aria-label={t("options.strengthLabel")}
							>
								<ProgressTrack className="bg-surface-2" size="sm">
									<ProgressIndicator />
								</ProgressTrack>
							</ProgressRoot>
						</div>
						<SmoothButton onClick={copy} size="sm" variant="secondary">
							{tc("copy")}
						</SmoothButton>
					</div>
				) : (
					<p className="text-small text-text-2">{t("options.emptyHint")}</p>
				)}
			</div>
			<div className="order-1 flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6 lg:order-2">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="password-length-label">
							{t("options.length")}
						</span>
						<output
							aria-labelledby="password-length-label"
							className="font-display text-h3 tabular-nums"
						>
							{length}
						</output>
					</div>
					<Slider
						aria-label={t("options.length")}
						max={128}
						min={4}
						onValueChange={setLength}
						value={length}
					/>
				</div>
				{SET_KEYS.map((key) => (
					<div className="flex items-center justify-between gap-2" key={key}>
						{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the switch renders a labelable button */}
						<label className="flex cursor-pointer items-center gap-3 text-small text-text">
							<Switch
								checked={sets[key]}
								onCheckedChange={(checked) =>
									setSets((current) => ({ ...current, [key]: checked }))
								}
							/>
							{t(`options.${key}`)}
						</label>
					</div>
				))}
				<div className="flex items-center justify-between gap-2">
					{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the switch renders a labelable button */}
					<label className="flex cursor-pointer items-center gap-3 text-small text-text">
						<Switch
							checked={excludeAmbiguous}
							onCheckedChange={setExcludeAmbiguous}
						/>
						{t("options.excludeAmbiguous")}
					</label>
				</div>
				<SmoothButton
					className="w-full"
					disabled={!pool}
					onClick={generate}
					size="lg"
				>
					{t("options.generate")}
				</SmoothButton>
			</div>
		</div>
	);
}
