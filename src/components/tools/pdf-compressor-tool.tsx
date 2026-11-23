"use client";

import * as Comlink from "comlink";
import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Progress from "@/components/smoothui/progress";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import { selectTriggerClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import {
	MAX_PDF_BYTES,
	type PdfQuality,
	sizeVerdict,
} from "@/lib/pdf/compress";
import { pdfWorker } from "@/lib/pdf/worker-client";

const QUALITIES: PdfQuality[] = ["low", "medium", "high"];

export default function PdfCompressorTool() {
	const t = useTranslations("tools.pdf-compressor");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [quality, setQuality] = useState<PdfQuality>("medium");
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ bytes: Uint8Array; pages: number } | null>(null);

	const compress = async () => {
		if (!file || running) {
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		setProgress({ done: 0, total: 1 });
		try {
			const worker = await pdfWorker();
			const response = await worker.compressPdf(
				await file.arrayBuffer(),
				quality,
				Comlink.proxy((done: number, total: number) =>
					setProgress({ done, total }),
				),
			);
			if (!response.ok) {
				setError(t("options.failed"));
				return;
			}
			setResult(response.value);
			notify.success(t("options.done"));
		} catch {
			setError(t("options.failed"));
		} finally {
			setRunning(false);
			setProgress(null);
		}
	};

	const verdict = result && file ? sizeVerdict(file.size, result.bytes.byteLength) : null;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept="application/pdf,.pdf"
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					onFiles={(files) => {
						const [picked] = files;
						if (!picked) {
							return;
						}
						if (picked.size > MAX_PDF_BYTES) {
							setError(te("tooLarge", { limit: formatBytes(MAX_PDF_BYTES) }));
							return;
						}
						setFile(picked);
						setResult(null);
						setError(null);
					}}
				/>
				{file ? (
					<div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
						<FileText aria-hidden="true" className="size-6 shrink-0 text-blue-500" />
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-small text-text">{file.name}</span>
							<span className="text-caption text-text-3">
								{formatBytes(file.size)}
							</span>
						</div>
					</div>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{progress ? (
					<div className="flex flex-col gap-2">
						<Progress
							aria-label={t("options.progress")}
							max={progress.total}
							value={progress.done}
						/>
						<p className="text-caption text-text-3">
							{t("options.progressLabel", {
								done: progress.done,
								total: progress.total,
							})}
						</p>
					</div>
				) : null}
				{result && file && verdict ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5" data-testid="compress-result">
						<dl className="grid gap-2 text-small">
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.before")}</dt>
								<dd className="font-mono text-text">{formatBytes(file.size)}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.after")}</dt>
								<dd className="font-mono text-text">
									{formatBytes(result.bytes.byteLength)}
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">{t("options.pages")}</dt>
								<dd className="font-mono text-text">{result.pages}</dd>
							</div>
						</dl>
						<p
							className={
								verdict.label === "smaller" ? "text-small text-success" : "text-small text-warn"
							}
						>
							{verdict.label === "smaller"
								? t("options.smaller", { percent: verdict.percent })
								: verdict.label === "larger"
									? t("options.larger", { percent: verdict.percent })
									: t("options.same")}
						</p>
						{verdict.label !== "smaller" ? (
							<p className="text-caption text-text-3">{t("options.keepOriginal")}</p>
						) : null}
						<SmoothButton
							onClick={() =>
								downloadBytes(
									result.bytes.buffer.slice(
										result.bytes.byteOffset,
										result.bytes.byteOffset + result.bytes.byteLength,
									) as ArrayBuffer,
									"application/pdf",
									`${file.name.replace(/\.pdf$/i, "")}-compressed.pdf`,
								)
							}
							size="lg"
						>
							<Download aria-hidden="true" className="size-4" />
							{t("options.download")}
						</SmoothButton>
					</div>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="pdf-quality">{t("options.quality")}</FieldLabel>
					<Select
						aria-label={t("options.quality")}
						className={selectTriggerClass}
						onValueChange={(value) => {
							setQuality(value as PdfQuality);
							setResult(null);
						}}
						options={QUALITIES.map((entry) => ({
							label: t(`options.quality${entry[0]?.toUpperCase()}${entry.slice(1)}`),
							value: entry,
						}))}
						value={quality}
					/>
				</Field>
				<p className="text-small text-text-2">{t("options.hint")}</p>
				<p className="text-caption text-text-3">{t("options.rasterNote")}</p>
				<SmoothButton
					disabled={!file || running}
					loading={running}
					onClick={compress}
					size="lg"
				>
					{t("options.compress")}
				</SmoothButton>
			</div>
		</div>
	);
}