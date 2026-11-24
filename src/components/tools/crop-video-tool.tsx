"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import JobStatus from "@/components/video/job-status";
import { inputClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import { cn } from "@/lib/utils";
import { aspectCropBox, type CropBox, cropArgs } from "@/lib/video/commands";
import { runFfmpegJob } from "@/lib/video/ffmpeg-client";
import type { FfmpegCore } from "@/lib/video/ffmpeg-core";
import {
	checkVideoFile,
	classifyFailure,
	videoFormat,
} from "@/lib/video/limits";
import {
	probeVideoOrMeta,
	VIDEO_ACCEPT,
	type VideoMeta,
} from "@/lib/video/probe";

const PRESETS: Array<{ key: string; ratio: number | null }> = [
	{ key: "16:9", ratio: 16 / 9 },
	{ key: "9:16", ratio: 9 / 16 },
	{ key: "1:1", ratio: 1 },
	{ key: "4:3", ratio: 4 / 3 },
];

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	width: number;
	height: number;
	url: string;
}

export default function CropVideoTool() {
	const t = useTranslations("tools.crop-video");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [preset, setPreset] = useState<string>("16:9");
	const [custom, setCustom] = useState(false);
	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [core, setCore] = useState<FfmpegCore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const meta = useRef<VideoMeta | null>(null);
	const urls = useRef<string[]>([]);

	const clearUrls = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
	};

	const reset = () => {
		clearUrls();
		meta.current = null;
		setFile(null);
		setError(null);
		setResult(null);
		setProgress(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		const check = checkVideoFile(picked);
		if (!check.ok) {
			setFile(picked);
			setError(
				check.kind === "size"
					? te("tooLarge", { limit: formatBytes(check.limit) })
					: te("unsupportedFormat", { format: check.format }),
			);
			return;
		}
		setFile(picked);
		setLoading(true);
		try {
			// cropping needs the true frame size. the browser preview
			// fails on mov and hevc, so the engine reads those.
			meta.current = await probeVideoOrMeta(picked);
		} catch {
			setError(te("unsupportedCodec", { format: videoFormat(picked) }));
		} finally {
			setLoading(false);
		}
	};

	const boxFor = (): CropBox | null => {
		const info = meta.current;
		if (!info) {
			return null;
		}
		if (!custom) {
			const ratio =
				PRESETS.find((entry) => entry.key === preset)?.ratio ?? 16 / 9;
			return aspectCropBox(info.width, info.height, ratio);
		}
		const parsedWidth = Number.parseInt(width, 10);
		const parsedHeight = Number.parseInt(height, 10);
		if (
			!Number.isFinite(parsedWidth) ||
			!Number.isFinite(parsedHeight) ||
			parsedWidth < 2 ||
			parsedHeight < 2 ||
			parsedWidth > info.width ||
			parsedHeight > info.height
		) {
			return null;
		}
		const evenWidth = parsedWidth - (parsedWidth % 2);
		const evenHeight = parsedHeight - (parsedHeight % 2);
		return {
			width: evenWidth,
			height: evenHeight,
			x: Math.floor((info.width - evenWidth) / 2),
			y: Math.floor((info.height - evenHeight) / 2),
		};
	};

	const apply = async () => {
		if (!file || !meta.current || running || loading) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		const box = boxFor();
		if (!box) {
			setError(te("generic"));
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		clearUrls();
		setProgress(null);
		try {
			const job = await runFfmpegJob(
				(threads) => cropArgs(box, threads),
				[{ name: "in.mp4", data: await file.arrayBuffer() }],
				["out.mp4"],
				(ratio) => setProgress(Math.round(ratio * 100)),
			);
			setCore(job.core);
			const [out] = job.outputs;
			if (!out) {
				throw new Error("no output");
			}
			const filename = `${stemOf(file.name)}-cropped.mp4`;
			const url = URL.createObjectURL(
				new Blob([out.data], { type: "video/mp4" }),
			);
			urls.current.push(url);
			setResult({
				bytes: out.data,
				filename,
				width: box.width,
				height: box.height,
				url,
			});
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			const kind = classifyFailure(unknown);
			setError(
				kind === "memory"
					? te("outOfMemory")
					: kind === "unsupported"
						? te("unsupportedCodec", { format: videoFormat(file) })
						: tc("engineFailed"),
			);
		} finally {
			setRunning(false);
			setProgress(null);
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={VIDEO_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running || loading}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						{/* biome-ignore lint/a11y/useMediaCaption: user-file preview, no captions exist */}
						<video
							className="h-auto w-full rounded-lg"
							controls
							data-testid="video-preview"
							src={result.url}
						/>
						<p className="font-display text-small tabular-nums text-text-2">
							{result.width} × {result.height}
						</p>
						<SmoothButton
							onClick={() =>
								downloadBytes(result.bytes, "video/mp4", result.filename)
							}
							size="sm"
							variant="secondary"
						>
							{tc("download")}
						</SmoothButton>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-2">
					<fieldset className="flex flex-wrap gap-2">
						<legend className="text-small font-medium">
							{t("options.aspect")}
						</legend>
						{PRESETS.map((entry) => (
							<button
								aria-pressed={!custom && preset === entry.key}
								className={cn(
									"min-h-11 cursor-pointer rounded-lg border px-3 text-small outline-none transition-colors focus-visible:border-blue-500",
									!custom && preset === entry.key
										? "border-blue-500 text-blue-500 shadow-glow"
										: "border-border bg-surface-2 text-text-2 hover:text-text",
								)}
								key={entry.key}
								onClick={() => {
									setPreset(entry.key);
									setCustom(false);
								}}
								type="button"
							>
								{entry.key}
							</button>
						))}
						<button
							aria-pressed={custom}
							className={cn(
								"min-h-11 cursor-pointer rounded-lg border px-3 text-small outline-none transition-colors focus-visible:border-blue-500",
								custom
									? "border-blue-500 text-blue-500 shadow-glow"
									: "border-border bg-surface-2 text-text-2 hover:text-text",
							)}
							onClick={() => setCustom(true)}
							type="button"
						>
							{t("options.free")}
						</button>
					</fieldset>
				</div>
				{custom ? (
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor="crop-video-width">
								{t("options.width")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="crop-video-width"
								inputMode="numeric"
								onChange={(event) => setWidth(event.target.value)}
								type="number"
								value={width}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="crop-video-height">
								{t("options.height")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="crop-video-height"
								inputMode="numeric"
								onChange={(event) => setHeight(event.target.value)}
								type="number"
								value={height}
							/>
						</Field>
					</div>
				) : null}
				<p className="text-small text-text-2">{t("options.centerNote")}</p>
				<SmoothButton
					className="w-full"
					disabled={running || loading}
					loading={running}
					onClick={apply}
					size="lg"
				>
					{t("options.apply")}
				</SmoothButton>
				{running || core ? (
					<JobStatus
						applyLabel={t("options.apply")}
						core={core}
						coreMt={tc("coreMt")}
						coreSt={tc("coreSt")}
						loading={running && progress === null}
						loadingLabel={tc("loadingVideoEngine")}
						progress={progress}
					/>
				) : null}
			</div>
		</div>
	);
}
