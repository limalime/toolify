"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import FileList, {
	type FileRow,
	type FileRowStatus,
} from "@/components/primitives/file-list";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import {
	ProgressIndicator,
	ProgressLabel,
	ProgressRoot,
	ProgressTrack,
	ProgressValue,
} from "@/components/smoothui/progress";
import Select from "@/components/smoothui/select";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import ColorPickerField from "@/components/tool/color-picker-field";
import { selectTriggerClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBlob } from "@/lib/images/download";
import {
	CONVERTER_ACCEPT,
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	needsBackground,
	OUTPUT_FORMATS,
	OUTPUT_META,
	stemOf,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import { zipFiles } from "@/lib/images/zip";
import type { OutputFormat } from "@/workers/image-worker";

interface Job extends FileRow {
	file: File;
	result?: {
		bytes: ArrayBuffer;
		mime: string;
		extension: string;
		filename: string;
	};
}

export default function ImageConverterTool() {
	const t = useTranslations("tools.image-converter");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [jobs, setJobs] = useState<Job[]>([]);
	const [format, setFormat] = useState<OutputFormat>("jpg");
	const [quality, setQuality] = useState(85);
	const [background, setBackground] = useState("#ffffff");
	const [running, setRunning] = useState(false);
	const [runDone, setRunDone] = useState(0);
	const [runTotal, setRunTotal] = useState(0);
	const urls = useRef<string[]>([]);

	useEffect(() => {
		const current = urls.current;
		return () => {
			for (const url of current) {
				URL.revokeObjectURL(url);
			}
		};
	}, []);

	const patchJob = (id: string, patch: Partial<Job>) => {
		setJobs((previous) =>
			previous.map((job) => (job.id === id ? { ...job, ...patch } : job)),
		);
	};

	const revokeJobUrl = (job: Job) => {
		if (job.downloadUrl) {
			URL.revokeObjectURL(job.downloadUrl);
			urls.current = urls.current.filter((url) => url !== job.downloadUrl);
		}
	};

	// option edits invalidate finished rows so Convert always means convert.
	const markDirty = () => {
		setJobs((previous) =>
			previous.map((job) => {
				if (job.status !== "done") {
					return job;
				}
				revokeJobUrl(job);
				const { result: _result, downloadUrl: _url, ...rest } = job;
				return {
					...rest,
					status: "queued" as FileRowStatus,
					progress: undefined,
				};
			}),
		);
		setRunDone(0);
		setRunTotal(0);
	};

	const addFiles = (files: File[]) => {
		setJobs((previous) => [
			...previous,
			...files.map((file) => {
				const oversized = file.size > MAX_IMAGE_BYTES;
				return {
					id: crypto.randomUUID(),
					file,
					name: file.name,
					size: file.size,
					status: (oversized ? "failed" : "queued") as FileRowStatus,
					error: oversized
						? te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) })
						: undefined,
				};
			}),
		]);
	};

	const runJob = async (job: Job): Promise<Job> => {
		const worker = await imageWorker();
		const input = await job.file.arrayBuffer();
		const decoded = await worker.decodeInput(input, job.file.name);
		if (decoded.width * decoded.height > MAX_IMAGE_PIXELS) {
			throw new Error("pixels");
		}
		const encoded = await worker.encodeImage(
			decoded.image,
			format,
			quality,
			background,
		);
		const filename = `${stemOf(job.file.name)}.${encoded.extension}`;
		const url = URL.createObjectURL(
			new Blob([encoded.bytes], { type: encoded.mime }),
		);
		urls.current.push(url);
		return {
			...job,
			status: "done",
			progress: 100,
			downloadUrl: url,
			downloadName: filename,
			result: {
				bytes: encoded.bytes,
				mime: encoded.mime,
				extension: encoded.extension,
				filename,
			},
		};
	};

	const convert = async (only?: string) => {
		if (running) {
			return;
		}
		const targets = jobs.filter(
			(job) =>
				(!only || job.id === only) &&
				job.status !== "done" &&
				job.status !== "processing",
		);
		if (targets.length === 0) {
			if (jobs.length === 0) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		setRunning(true);
		setRunDone(0);
		setRunTotal(targets.length);
		try {
			let done = 0;
			for (const target of targets) {
				patchJob(target.id, {
					status: "processing",
					progress: undefined,
					error: undefined,
				});
				try {
					const finished = await runJob({ ...target, status: "processing" });
					patchJob(target.id, finished);
				} catch (error) {
					if (process.env.NODE_ENV !== "production") {
						console.error(error);
					}
					const message =
						error instanceof Error && error.message === "pixels"
							? te("tooLarge", { limit: "64 MP" })
							: te("unreadableFile");
					patchJob(target.id, { status: "failed", error: message });
				}
				done += 1;
				setRunDone(done);
			}
		} finally {
			setRunning(false);
		}
	};

	const clear = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		setJobs([]);
		setRunDone(0);
		setRunTotal(0);
	};

	const finished = jobs.filter((job) => job.status === "done" && job.result);
	const percent = runTotal === 0 ? 0 : Math.round((runDone / runTotal) * 100);

	const downloadAll = () => {
		const entries = finished
			.filter((job) => job.result)
			.map((job) => ({
				name: (job.result as { filename: string }).filename,
				bytes: new Uint8Array((job.result as { bytes: ArrayBuffer }).bytes),
			}));
		if (entries.length === 0) {
			return;
		}
		downloadBlob(
			new Blob([zipFiles(entries)], { type: "application/zip" }),
			"toolify-image-converter.zip",
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={CONVERTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					multiple
					onFiles={addFiles}
				/>
				<p className="text-small text-text-3">{t("options.inputNote")}</p>
				{jobs.length > 0 ? (
					<div className="flex flex-wrap items-center gap-3">
						<SmoothButton
							disabled={running}
							onClick={clear}
							size="sm"
							variant="secondary"
						>
							{tc("clear")}
						</SmoothButton>
						{finished.length > 0 ? (
							<SmoothButton onClick={downloadAll} size="sm" variant="secondary">
								{tc("downloadAll")}
							</SmoothButton>
						) : null}
					</div>
				) : null}
				{jobs.length > 0 ? (
					<FileList
						files={jobs}
						labels={{
							converting: (name) => tc("converting", { name }),
							download: tc("download"),
							retry: tc("retry"),
						}}
						onRetry={(id) => convert(id)}
					/>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="converter-format">
						{t("options.format")}
					</FieldLabel>
					<Select
						aria-label={t("options.format")}
						className={selectTriggerClass}
						onValueChange={(value) => {
							setFormat(value as OutputFormat);
							markDirty();
						}}
						options={OUTPUT_FORMATS.map((item) => ({
							label: OUTPUT_META[item].label,
							value: item,
						}))}
						value={format}
					/>
				</Field>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span
							className="text-small font-medium"
							id="converter-quality-label"
						>
							{t("options.quality")}
						</span>
						<output
							aria-labelledby="converter-quality-label"
							className="font-display text-h3 tabular-nums"
						>
							{quality}
						</output>
					</div>
					<Slider
						aria-label={t("options.quality")}
						max={100}
						min={0}
						onValueChange={(value) => {
							setQuality(value);
							markDirty();
						}}
						value={quality}
					/>
				</div>
				<Field>
					<FieldLabel htmlFor="converter-background">
						{t("options.background")}
					</FieldLabel>
					<ColorPickerField
						className="h-11"
						disabled={!needsBackground(format)}
						id="converter-background"
						label={t("options.background")}
						onChange={(value) => {
							setBackground(value);
							markDirty();
						}}
						value={background}
					/>
					<p className="text-caption text-text-3">{t("options.bgNote")}</p>
				</Field>
				{format === "svg" ? (
					<p className="text-small text-text-2">{t("options.svgNote")}</p>
				) : null}
				<SmoothButton
					className="w-full"
					loading={running}
					onClick={() => convert()}
					size="lg"
				>
					{tc("convert")}
				</SmoothButton>
				{runTotal > 0 ? (
					<ProgressRoot value={percent}>
						<div className="flex items-center justify-between gap-2">
							<ProgressLabel>
								{tc("batchOf", {
									done: Math.min(runDone + (running ? 1 : 0), runTotal),
									total: runTotal,
								})}
							</ProgressLabel>
							<ProgressValue />
						</div>
						<ProgressTrack className="bg-surface-2" size="sm">
							<ProgressIndicator />
						</ProgressTrack>
					</ProgressRoot>
				) : null}
			</div>
		</div>
	);
}
