"use client";

import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBytes } from "@/lib/images/download";
import { buildQrContent, type QrKind } from "@/lib/text/qr";

const KINDS: QrKind[] = [
	"text",
	"url",
	"wifi",
	"vcard",
	"email",
	"sms",
	"phone",
	"geo",
];

const KIND_LABELS: Record<QrKind, string> = {
	text: "kindText",
	url: "kindUrl",
	wifi: "kindWifi",
	vcard: "kindVcard",
	email: "kindEmail",
	sms: "kindSms",
	phone: "kindPhone",
	geo: "kindGeo",
};

interface Result {
	png: string;
	svg: string;
}

export default function QrCodeGeneratorTool() {
	const t = useTranslations("tools.qr-code-generator");
	const [kind, setKind] = useState<QrKind>("text");
	const [fields, setFields] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);

	const set = (name: string, value: string) => {
		setFields((current) => ({ ...current, [name]: value }));
	};

	const input = (
		name: string,
		label: string,
		type = "text",
		inputMode?: "decimal" | "tel",
	) => (
		<Field key={name}>
			<FieldLabel htmlFor={`qr-${name}`}>{label}</FieldLabel>
			<FieldControl
				autoComplete="off"
				className={inputClass}
				id={`qr-${name}`}
				inputMode={inputMode}
				onChange={(event) => set(name, event.target.value)}
				type={type}
				value={fields[name] ?? ""}
			/>
		</Field>
	);

	const generate = async () => {
		setError(null);
		setResult(null);
		let content: string;
		try {
			content = buildQrContent(kind, fields);
		} catch (unknown) {
			const message = unknown instanceof Error ? unknown.message : "";
			if (message === "empty content") {
				notify.warning(t("options.needText"));
				return;
			}
			setError(
				message === "invalid coordinates"
					? t("options.badCoords")
					: t("options.tooLong"),
			);
			return;
		}
		try {
			const [png, svg] = await Promise.all([
				QRCode.toDataURL(content, {
					errorCorrectionLevel: "M",
					margin: 2,
					width: 1024,
				}),
				QRCode.toString(content, { errorCorrectionLevel: "M", type: "svg" }),
			]);
			setResult({ png, svg });
		} catch {
			setError(t("options.tooLong"));
		}
	};

	const downloadSvg = () => {
		if (!result) {
			return;
		}
		downloadBytes(
			new TextEncoder().encode(result.svg).buffer as ArrayBuffer,
			"image/svg+xml",
			"qr-code.svg",
		);
	};

	const downloadPng = async () => {
		if (!result) {
			return;
		}
		const bytes = await (await fetch(result.png)).arrayBuffer();
		downloadBytes(bytes, "image/png", "qr-code.png");
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="qr-kind">{t("options.kind")}</FieldLabel>
					<Select
						aria-label={t("options.kind")}
						className={selectTriggerClass}
						onValueChange={(value) => {
							setKind(value as QrKind);
							setError(null);
							setResult(null);
						}}
						options={KINDS.map((item) => ({
							label: t(`options.${KIND_LABELS[item]}`),
							value: item,
						}))}
						value={kind}
					/>
				</Field>
				{(kind === "text" || kind === "url") &&
					input(
						kind === "text" ? "text" : "url",
						t(`options.${kind === "text" ? "text" : "url"}`),
					)}
				{kind === "wifi" && (
					<>
						{input("ssid", t("options.ssid"))}
						{input("password", t("options.password"))}
						<Field>
							<FieldLabel htmlFor="qr-encryption">
								{t("options.encryption")}
							</FieldLabel>
							<Select
								aria-label={t("options.encryption")}
								className={selectTriggerClass}
								onValueChange={(value) => set("encryption", value)}
								options={[
									{ label: t("options.encWpa"), value: "WPA" },
									{ label: t("options.encWep"), value: "WEP" },
									{ label: t("options.encNone"), value: "nopass" },
								]}
								value={fields.encryption ?? "WPA"}
							/>
						</Field>
						{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the switch renders a labelable button */}
						<label className="flex cursor-pointer items-center gap-3 text-small text-text">
							<Switch
								checked={fields.hidden === "1"}
								onCheckedChange={(checked) =>
									set("hidden", checked ? "1" : "0")
								}
							/>
							{t("options.hidden")}
						</label>
					</>
				)}
				{kind === "vcard" && (
					<>
						{input("first", t("options.firstName"))}
						{input("last", t("options.lastName"))}
						{input("phone", t("options.phone"), "text", "tel")}
						{input("email", t("options.email"))}
						{input("org", t("options.org"))}
						{input("url", t("options.website"))}
					</>
				)}
				{kind === "email" && (
					<>
						{input("to", t("options.to"))}
						{input("subject", t("options.subject"))}
						{input("body", t("options.body"))}
					</>
				)}
				{kind === "sms" && (
					<>
						{input("number", t("options.number"), "text", "tel")}
						{input("body", t("options.body"))}
					</>
				)}
				{kind === "phone" &&
					input("number", t("options.number"), "text", "tel")}
				{kind === "geo" && (
					<>
						{input("latitude", t("options.latitude"), "text", "decimal")}
						{input("longitude", t("options.longitude"), "text", "decimal")}
					</>
				)}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						{/* biome-ignore lint/performance/noImgElement: generated data url, next-image cannot optimize it */}
						<img
							alt="QR code"
							className="h-auto w-full max-w-80 rounded-lg bg-white"
							src={result.png}
						/>
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
				<SmoothButton className="w-full" onClick={generate} size="lg">
					{t("options.generate")}
				</SmoothButton>
			</div>
		</div>
	);
}
