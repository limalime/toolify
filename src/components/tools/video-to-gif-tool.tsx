"use client";

import * as Comlink from "comlink";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import JobStatus from "@/components/video/job-status";
import { selectTriggerClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import { gifArgs } from "@/lib/video/commands";
import { ffmpegLoaded } from "@/lib/video/ffmpeg-client";
import {
	type FfmpegCore,
	MAX_VIDEO_BYTES,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import { probeVideo, VIDEO_ACCEPT, type VideoMeta } from "@/lib/video/probe";

const FPS_CHOICES = [10, 15, 24];
const WIDTH_CHOICES = [320, 480, 640];
const MAX_GIF_SECONDS = 30;

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	url: string;
}

export default function VideoToGifTool() {
	const t = useTranslations("tools.video-to-gif");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [fps, setFps] = useState("15");
	const [width, setWidth] = useState("480");
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
			const probed = await probeVideo(picked);
			if (probed.durationSec > MAX_GIF_SECONDS) {
				setError(t("options.limitNote"));
				return;
			}
			meta.current = probed;
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
			const [out] = await worker.runFfmpeg(
				gifArgs(Number(fps), Number(width), threads),
				[{ name: "in.mp4", data: await file.arrayBuffer() }],
				["out.gif"],
				Comlink.proxy((ratio: number) => {
					setProgress(Math.round(ratio * 100));
				}),
			);
			if (!out) {
				throw new Error("no output");
			}
			const filename = `${stemOf(file.name)}.gif`;
			const url = URL.createObjectURL(
				new Blob([out.data], { type: "image/gif" }),
			);
			urls.current.push(url);
			setResult({ bytes: out.data, filename, url });
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
						{/* biome-ignore lint/performance/noImgElement: blob url, next-image cannot optimize object urls */}
						<img
							alt={result.filename}
							className="h-auto w-full rounded-lg"
							src={result.url}
						/>
						<SmoothButton
							onClick={() =>
								downloadBytes(result.bytes, "image/gif", result.filename)
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
				<Field>
					<FieldLabel htmlFor="gif-fps">{t("options.fps")}</FieldLabel>
					<Select
						aria-label={t("options.fps")}
						className={selectTriggerClass}
						onValueChange={setFps}
						options={FPS_CHOICES.map((rate) => ({
							label: `${rate} fps`,
							value: String(rate),
						}))}
						value={fps}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="gif-width">{t("options.width")}</FieldLabel>
					<Select
						aria-label={t("options.width")}
						className={selectTriggerClass}
						onValueChange={setWidth}
						options={WIDTH_CHOICES.map((size) => ({
							label: `${size} px`,
							value: String(size),
						}))}
						value={width}
					/>
				</Field>
				<p className="text-small text-text-2">{t("options.limitNote")}</p>
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
