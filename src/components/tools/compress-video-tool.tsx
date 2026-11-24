"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import JobStatus from "@/components/video/job-status";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import { parseTargetSize } from "@/lib/size";
import {
	compressQualityArgs,
	compressSizeArgs,
	targetVideoBitrateKbps,
} from "@/lib/video/commands";
import { runFfmpegWithFallback } from "@/lib/video/ffmpeg-client";
import type { FfmpegCore } from "@/lib/video/ffmpeg-core";
import {
	checkVideoFile,
	classifyVideoError,
	videoFormat,
} from "@/lib/video/limits";
import {
	probeVideoOrMeta,
	VIDEO_ACCEPT,
	type VideoMeta,
} from "@/lib/video/probe";

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	url: string;
	before: number;
	after: number;
}

export default function CompressVideoTool() {
	const t = useTranslations("tools.compress-video");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [mode, setMode] = useState("quality");
	const [crf, setCrf] = useState(24);
	const [target, setTarget] = useState("");
	const [targetError, setTargetError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [core, setCore] = useState<FfmpegCore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const meta = useRef<VideoMeta | null>(null);
	const urls = useRef<string[]>([]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		meta.current = null;
		setFile(null);
		setError(null);
		setTargetError(null);
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
			// quality mode works without metadata. only the target size
			// mode needs the duration, so a failed probe is not fatal.
			meta.current = await probeVideoOrMeta(picked);
		} catch {
			meta.current = null;
		} finally {
			setLoading(false);
		}
	};

	const apply = async () => {
		if (!file || running || loading) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		let targetBitrate = 0;
		if (mode === "size") {
			const targetBytes = parseTargetSize(target);
			if (!targetBytes) {
				setTargetError(t("options.targetInvalid"));
				return;
			}
			const duration = meta.current?.durationSec;
			if (!duration) {
				setTargetError(te("needDuration"));
				return;
			}
			setTargetError(null);
			try {
				targetBitrate = targetVideoBitrateKbps(targetBytes, duration, 128);
			} catch {
				setTargetError(t("options.targetInvalid"));
				return;
			}
		}
		setRunning(true);
		setError(null);
		setResult(null);
		setProgress(null);
		try {
			const job = await runFfmpegWithFallback(
				(threads) =>
					mode === "size"
						? compressSizeArgs(targetBitrate, threads)
						: compressQualityArgs(crf, threads),
				[{ name: "in.mp4", data: await file.arrayBuffer() }],
				["out.mp4"],
				(ratio) => setProgress(Math.round(ratio * 100)),
			);
			setCore(job.core);
			const [out] = job.outputs;
			if (!out) {
				throw new Error("no output");
			}
			const filename = `${stemOf(file.name)}-compressed.mp4`;
			const url = URL.createObjectURL(
				new Blob([out.data], { type: "video/mp4" }),
			);
			urls.current.push(url);
			setResult({
				bytes: out.data,
				filename,
				url,
				before: file.size,
				after: out.data.byteLength,
			});
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			const kind = classifyVideoError(unknown);
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
							{t("options.before")}: {formatBytes(result.before)} ·{" "}
							{t("options.after")}: {formatBytes(result.after)}
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
				<TabsRoot defaultValue="quality" onValueChange={setMode}>
					<TabsList>
						<TabsTab className={tabActiveClass} value="quality">
							{t("options.modeQuality")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="size">
							{t("options.modeSize")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>
				{mode === "quality" ? (
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
								{crf}
							</output>
						</div>
						<Slider
							aria-label={t("options.quality")}
							max={32}
							min={18}
							onValueChange={setCrf}
							value={crf}
						/>
					</div>
				) : (
					<Field>
						<FieldLabel htmlFor="compress-target">
							{t("options.targetSize")}
						</FieldLabel>
						<FieldControl
							autoComplete="off"
							className={inputClass}
							id="compress-target"
							onChange={(event) => setTarget(event.target.value)}
							placeholder={t("options.targetPlaceholder")}
							value={target}
						/>
						{targetError ? (
							<p className="text-small text-error" role="alert">
								{targetError}
							</p>
						) : null}
					</Field>
				)}
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
