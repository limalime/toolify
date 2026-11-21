"use client";

import * as Comlink from "comlink";
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
import { ffmpegLoaded } from "@/lib/video/ffmpeg-client";
import {
	type FfmpegCore,
	MAX_VIDEO_BYTES,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import { probeVideo, VIDEO_ACCEPT, type VideoMeta } from "@/lib/video/probe";

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
		if (picked.size > MAX_VIDEO_BYTES) {
			setFile(picked);
			setError(te("tooLarge", { limit: formatBytes(MAX_VIDEO_BYTES) }));
			return;
		}
		setFile(picked);
		setLoading(true);
		try {
			meta.current = await probeVideo(picked);
		} catch {
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	const apply = async () => {
		if (!file || !meta.current || running || loading) {
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
			setTargetError(null);
			try {
				targetBitrate = targetVideoBitrateKbps(
					targetBytes,
					meta.current.durationSec,
					128,
				);
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
			let loaded: Awaited<ReturnType<typeof ffmpegLoaded>>;
			try {
				loaded = await ffmpegLoaded();
			} catch {
				setError(tc("engineFailed"));
				return;
			}
			const { worker, core: used } = loaded;
			setCore(used);
			const threads =
				used === "mt"
					? threadCount(globalThis.navigator?.hardwareConcurrency ?? 4)
					: 1;
			const args =
				mode === "size"
					? compressSizeArgs(targetBitrate, threads)
					: compressQualityArgs(crf, threads);
			const [out] = await worker.runFfmpeg(
				args,
				[{ name: "in.mp4", data: await file.arrayBuffer() }],
				["out.mp4"],
				Comlink.proxy((ratio: number) => {
					setProgress(Math.round(ratio * 100));
				}),
			);
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
			setError(te("unreadableFile"));
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
