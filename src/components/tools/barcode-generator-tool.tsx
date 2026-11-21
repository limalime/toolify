"use client";

import JsBarcode from "jsbarcode";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBytes } from "@/lib/images/download";
import {
	BARCODE_FORMATS,
	type BarcodeFormat,
	validateBarcode,
} from "@/lib/text/barcode";

const HINTS: Record<BarcodeFormat, string> = {
	CODE128: "hintCode128",
	CODE39: "hintCode39",
	EAN13: "hintEan13",
	EAN8: "hintEan8",
	UPC: "hintUpc",
	ITF: "hintItf",
	MSI: "hintMsi",
	pharmacode: "hintPharmacode",
	codabar: "hintCodabar",
};

export default function BarcodeGeneratorTool() {
	const t = useTranslations("tools.barcode-generator");
	const [format, setFormat] = useState<BarcodeFormat>("CODE128");
	const [text, setText] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [ready, setReady] = useState(false);
	const svg = useRef<SVGSVGElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);

	// t is stable per locale.
	// biome-ignore lint/correctness/useExhaustiveDependencies: validate on input change only
	useEffect(() => {
		if (!text) {
			setError(null);
			setReady(false);
			return;
		}
		const reason = validateBarcode(format, text);
		if (reason) {
			setError(t("options.invalid"));
			setReady(false);
			return;
		}
		setError(null);
		setReady(true);
	}, [text, format]);

	// t is stable per locale, refs are stable elements.
	// biome-ignore lint/correctness/useExhaustiveDependencies: render once mounted
	useEffect(() => {
		if (!ready || !svg.current || !canvas.current) {
			return;
		}
		try {
			const options = {
				format,
				width: 2,
				height: 100,
				displayValue: format !== "pharmacode",
				margin: 10,
			};
			JsBarcode(svg.current, text, options);
			JsBarcode(canvas.current, text, options);
		} catch {
			setError(t("options.invalid"));
			setReady(false);
		}
	}, [ready, text, format]);

	const guard = (): boolean => {
		if (!text.trim()) {
			notify.warning(t("options.needText"));
			return false;
		}
		if (!ready) {
			notify.warning(t("options.invalid"));
			return false;
		}
		return true;
	};

	const downloadSvg = () => {
		if (!guard() || !svg.current) {
			return;
		}
		const markup = new XMLSerializer().serializeToString(svg.current);
		downloadBytes(
			new TextEncoder().encode(markup).buffer as ArrayBuffer,
			"image/svg+xml",
			"barcode.svg",
		);
	};

	const downloadPng = () => {
		if (!guard() || !canvas.current) {
			return;
		}
		canvas.current.toBlob((blob) => {
			if (blob) {
				blob
					.arrayBuffer()
					.then((bytes) => downloadBytes(bytes, "image/png", "barcode.png"));
			}
		}, "image/png");
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="barcode-text">{t("options.text")}</FieldLabel>
					<FieldControl
						autoComplete="off"
						className={inputClass}
						id="barcode-text"
						onChange={(event) => setText(event.target.value)}
						value={text}
					/>
				</Field>
				<p className="text-small text-text-2">
					{t(`options.hints.${HINTS[format]}`)}
				</p>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{ready ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						<svg
							className="h-auto w-full rounded-lg bg-white"
							data-testid="barcode-preview"
							ref={svg}
						/>
						<canvas className="hidden" ref={canvas} />
						<div className="flex gap-2">
							<SmoothButton onClick={downloadPng} size="sm" variant="secondary">
								{t("options.downloadPng")}
							</SmoothButton>
							<SmoothButton onClick={downloadSvg} size="sm" variant="secondary">
								{t("options.downloadSvg")}
							</SmoothButton>
						</div>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="barcode-format">
						{t("options.format")}
					</FieldLabel>
					<Select
						aria-label={t("options.format")}
						className={selectTriggerClass}
						onValueChange={(value) => setFormat(value as BarcodeFormat)}
						options={BARCODE_FORMATS.map((item) => ({
							label: item,
							value: item,
						}))}
						value={format}
					/>
				</Field>
			</div>
		</div>
	);
}
