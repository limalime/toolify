"use client";

import { CircleCheck, File, LoaderCircle, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import {
	ProgressIndicator,
	ProgressLabel,
	ProgressRoot,
	ProgressTrack,
	ProgressValue,
} from "@/components/smoothui/progress";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import { trackToolComplete } from "@/lib/analytics-client";
import { inputClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBlob } from "@/lib/images/download";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import { zipFiles } from "@/lib/images/zip";
import { parseTargetSize } from "@/lib/size";
import { cn } from "@/lib/utils";
import type { OutputFormat } from "@/workers/image-worker";

interface Job {
	id: string;
	file: File;
	name: string;
	before: number;
	after?: number;
	status: "queued" | "processing" | "done" | "failed";
	error?: string;
	downloadUrl?: string;
	result?: {
		bytes: ArrayBuffer;
		mime: string;
		extension: string;
		filename: string;
	};
}

const FORMAT_OF: Record<string, OutputFormat> = {
	png: "png",
	jpg: "jpg",
	jpeg: "jpg",
	webp: "webp",
	avif: "avif",
};

const STATUS_ICON = {
	done: { className: "text-success", icon: CircleCheck },
	failed: { className: "text-error", icon: TriangleAlert },
	processing: { className: "text-blue-500", icon: LoaderCircle },
	queued: { className: "text-text-3", icon: File },
} as const;

export default function CompressImageTool() {
	const t = useTranslations("tools.compress-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [jobs, setJobs] = useState<Job[]>([]);
	const [quality, setQuality] = useState(75);
	const [target, setTarget] = useState("");
	const [targetError, setTargetError] = useState<string | null>(null);
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

	// option edits invalidate finished rows so Compress always means compress.
	const markDirty = () => {
		setJobs((previous) =>
			previous.map((job) => {
				if (job.status !== "done") {
					return job;
				}
				revokeJobUrl(job);
				const { result: _result, downloadUrl: _url, ...rest } = job;
				return { ...rest, status: "queued" as Job["status"], after: undefined };
			}),
		);
		setRunDone(0);
		setRunTotal(0);
	};

	const addFiles = (files: File[]) => {
		setJobs((previous) => [
			...previous,
			...files.map((file) => {
				const extension = file.name
					.slice(file.name.lastIndexOf(".") + 1)
					.toLowerCase();
				const accepted = FORMAT_OF[extension] !== undefined;
				const oversized = file.size > MAX_IMAGE_BYTES;
				return {
					id: crypto.randomUUID(),
					file,
					name: file.name,
					before: file.size,
					status: (oversized || !accepted
						? "failed"
						: "queued") as Job["status"],
					error: oversized
						? te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) })
						: !accepted
							? te("unsupported")
							: undefined,
				};
			}),
		]);
	};

	const runJob = async (job: Job, targetBytes: number | null): Promise<Job> => {
		const extension = job.file.name
			.slice(job.file.name.lastIndexOf(".") + 1)
			.toLowerCase();
		const format = FORMAT_OF[extension];
		if (!format) {
			throw new Error("unsupported");
		}
		const worker = await imageWorker();
		const decoded = await worker.decodeInput(
			await job.file.arrayBuffer(),
			job.file.name,
		);
		if (decoded.width * decoded.height > MAX_IMAGE_PIXELS) {
			throw new Error("pixels");
		}
		let best: { bytes: ArrayBuffer; mime: string; extension: string } | null =
			null;
		let low = 5;
		let high = quality;
		for (let round = 0; round < 8 && low <= high; round++) {
			const attempt = Math.floor((low + high) / 2);
			const encoded = await worker.encodeImage(
				decoded.image,
				format,
				attempt,
				"#ffffff",
			);
			if (!targetBytes || encoded.bytes.byteLength <= targetBytes) {
				best = encoded;
				low = attempt + 1;
			} else {
				high = attempt - 1;
			}
			if (!targetBytes) {
				break;
			}
		}
		if (!best) {
			const encoded = await worker.encodeImage(
				decoded.image,
				format,
				5,
				"#ffffff",
			);
			best = encoded;
		}
		const filename = `${stemOf(job.file.name)}-compressed.${best.extension}`;
		const url = URL.createObjectURL(
			new Blob([best.bytes], { type: best.mime }),
		);
		urls.current.push(url);
		return {
			...job,
			status: "done",
			after: best.bytes.byteLength,
			downloadUrl: url,
			result: {
				bytes: best.bytes,
				mime: best.mime,
				extension: best.extension,
				filename,
			},
		};
	};

	const compress = async (only?: string) => {
		if (running) {
			return;
		}
		const trimmedTarget = target.trim();
		const targetBytes = trimmedTarget ? parseTargetSize(trimmedTarget) : null;
		if (trimmedTarget && !targetBytes) {
			setTargetError(t("options.targetInvalid"));
			return;
		}
		setTargetError(null);
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
				patchJob(target.id, { status: "processing", error: undefined });
				try {
					const finished = await runJob(
						{ ...target, status: "processing" },
						targetBytes,
					);
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
			"toolify-compress-image.zip",
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={RASTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					multiple
					onFiles={addFiles}
				/>
				<p className="text-small text-text-3">{t("options.formatKept")}</p>
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
					<ul
						className="w-full divide-y divide-border"
						data-testid="compress-list"
					>
						{jobs.map((job) => {
							const status = STATUS_ICON[job.status];
							const Icon = status.icon;
							return (
								<li
									className="flex min-h-16 items-center gap-3 py-3"
									data-status={job.status}
									key={job.id}
								>
									<Icon
										aria-hidden="true"
										className={cn(
											"size-5 shrink-0",
											status.className,
											job.status === "processing" &&
												"animate-spin motion-reduce:animate-none",
										)}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-small text-text">{job.name}</p>
										<p className="font-display text-small tabular-nums text-text-2">
											{t("options.before")} {formatBytes(job.before)}
											{job.after !== undefined ? (
												<>
													{" → "}
													{t("options.after")} {formatBytes(job.after)}
												</>
											) : null}
										</p>
										{job.status === "failed" && job.error ? (
											<p className="mt-1 text-small text-error">{job.error}</p>
										) : null}
									</div>
									{job.status === "done" && job.downloadUrl ? (
										<SmoothButton
											asChild
											className="shrink-0"
											size="sm"
											variant="secondary"
										>
											<a
												download={job.result?.filename ?? job.name}
												href={job.downloadUrl}
												onClick={() => trackToolComplete()}
											>
												{tc("download")}
											</a>
										</SmoothButton>
									) : null}
									{job.status === "failed" && !running ? (
										<SmoothButton
											className="shrink-0"
											onClick={() => compress(job.id)}
											size="sm"
											variant="secondary"
										>
											{tc("retry")}
										</SmoothButton>
									) : null}
								</li>
							);
						})}
					</ul>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span
							className="text-small font-medium"
							id="compress-quality-label"
						>
							{t("options.quality")}
						</span>
						<output
							aria-labelledby="compress-quality-label"
							className="font-display text-h3 tabular-nums"
						>
							{quality}
						</output>
					</div>
					<Slider
						aria-label={t("options.quality")}
						max={100}
						min={1}
						onValueChange={(value) => {
							setQuality(value);
							markDirty();
						}}
						value={quality}
					/>
				</div>
				<Field>
					<FieldLabel htmlFor="compress-target">
						{t("options.targetSize")}
					</FieldLabel>
					<FieldControl
						className={inputClass}
						id="compress-target"
						placeholder={t("options.targetPlaceholder")}
						autoComplete="off"
						inputMode="text"
						value={target}
						onChange={(event) => {
							setTarget(event.target.value);
							setTargetError(null);
							markDirty();
						}}
					/>
					{targetError ? (
						<p className="text-small text-error" role="alert">
							{targetError}
						</p>
					) : null}
				</Field>
				<SmoothButton
					className="w-full"
					loading={running}
					onClick={() => compress()}
					size="lg"
				>
					{tc("compress")}
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
