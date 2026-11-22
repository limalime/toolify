// biome-ignore-all lint/suspicious/noArrayIndexKey: palette slots are positional, the hue offset defines the slot
"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Input from "@/components/smoothui/input";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import {
	buildPalette,
	type Harmony,
	normalizeHex,
	paletteToCss,
	paletteToJson,
	readableInk,
} from "@/lib/color/palette";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import { downloadBlob } from "@/lib/images/download";

const HARMONIES: Harmony[] = ["analogous", "complementary", "triadic"];

export default function ColorPaletteTool() {
	const t = useTranslations("tools.color-palette");
	const tc = useTranslations("common");

	const [base, setBase] = useState("#1b56fd");
	const [hexInput, setHexInput] = useState("#1b56fd");
	const [hexError, setHexError] = useState<string | null>(null);
	const [harmony, setHarmony] = useState<Harmony>("analogous");
	const [copied, setCopied] = useState<string | null>(null);
	const [copyError, setCopyError] = useState<string | null>(null);

	useEffect(() => {
		if (copied === null) {
			return;
		}
		const timer = setTimeout(() => setCopied(null), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	useEffect(() => {
		if (copyError === null) {
			return;
		}
		const timer = setTimeout(() => setCopyError(null), 5000);
		return () => clearTimeout(timer);
	}, [copyError]);

	const palette = useMemo(() => buildPalette(base, harmony), [base, harmony]);

	const applyColor = (next: string) => {
		setHexInput(next);
		const normalized = normalizeHex(next);
		if (normalized) {
			setBase(normalized);
			setHexError(null);
		} else {
			setHexError(t("options.invalidHex"));
		}
	};

	const copyText = async (text: string, key: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(key);
			setCopyError(null);
			notify.success(t("options.copied"));
		} catch {
			setCopyError(t("options.copyFailed"));
		}
	};

	const exportFile = (text: string, extension: string, mime: string) => {
		const name = `palette-${base.slice(1)}.${extension}`;
		downloadBlob(new Blob([text], { type: mime }), name);
	};

	return (
		<div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="palette-hex">{t("options.base")}</FieldLabel>
					<div className="flex items-center gap-2">
						<input
							aria-label={t("options.base")}
							className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-border bg-surface-2 p-1"
							onChange={(event) => applyColor(event.target.value)}
							type="color"
							value={base}
						/>
						<Input
							aria-invalid={hexError ? true : undefined}
							className={inputClass}
							data-testid="palette-hex"
							dir="ltr"
							id="palette-hex"
							onChange={(event) => applyColor(event.target.value)}
							spellCheck={false}
							value={hexInput}
						/>
					</div>
					<p className="text-caption text-text-3">{t("options.hex")}</p>
					{hexError ? (
						<p
							className="text-small text-error"
							data-testid="palette-hex-error"
							role="alert"
						>
							{hexError}
						</p>
					) : null}
				</Field>

				<div className="flex flex-col gap-2">
					<span className="text-small font-medium">{t("options.harmony")}</span>
					<TabsRoot
						onValueChange={(next) => {
							setHarmony(next as Harmony);
							setCopied(null);
						}}
						value={harmony}
					>
						<TabsList variant="segment">
							{HARMONIES.map((entry) => (
								<TabsTab
									className={`${tabActiveClass} px-1 text-center text-xs leading-tight`}
									key={entry}
									value={entry}
								>
									{t(`options.${entry}`)}
								</TabsTab>
							))}
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<h2 className="text-h3">{t("options.palette")}</h2>
					<SmoothButton
						data-testid="palette-copy-all"
						onClick={() => copyText(palette.join(", "), "all")}
						size="sm"
						variant="secondary"
					>
						{copied === "all" ? (
							<Check aria-hidden="true" className="size-4" />
						) : (
							<Copy aria-hidden="true" className="size-4" />
						)}
						{copied === "all" ? t("options.copied") : t("options.copyAll")}
					</SmoothButton>
				</div>

				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{palette.map((color, index) => {
						const ink = readableInk(color);
						return (
							<div
								className="flex min-h-44 flex-col justify-between gap-6 rounded-lg border p-4 lg:min-h-52"
								data-testid={`palette-swatch-${index}`}
								key={`${color}-${index}`}
								style={{
									backgroundColor: color,
									borderColor: `${ink}33`,
									color: ink,
								}}
							>
								<span
									className="font-display text-h3 uppercase tracking-wide"
									dir="ltr"
								>
									{color}
								</span>
								<button
									aria-label={t("options.copy", { hex: color })}
									className="w-fit rounded-md border px-2 py-1 text-caption outline-none transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2"
									onClick={() => copyText(color, color)}
									style={{
										borderColor: `${ink}59`,
										outlineColor: ink,
									}}
									type="button"
								>
									{copied === color ? t("options.copied") : tc("copy")}
								</button>
							</div>
						);
					})}
				</div>

				{copyError ? (
					<p className="text-small text-error" role="alert">
						{copyError}
					</p>
				) : null}

				<div className="flex flex-wrap gap-2">
					<SmoothButton
						onClick={() =>
							exportFile(paletteToCss(palette), "css", "text/css;charset=utf-8")
						}
						size="sm"
						variant="secondary"
					>
						{t("options.exportCss")}
					</SmoothButton>
					<SmoothButton
						onClick={() =>
							exportFile(
								paletteToJson({ base, harmony, colors: palette }),
								"json",
								"application/json;charset=utf-8",
							)
						}
						size="sm"
						variant="secondary"
					>
						{t("options.exportJson")}
					</SmoothButton>
				</div>

				<p className="text-caption text-text-3">{t("options.note")}</p>
			</div>
		</div>
	);
}
