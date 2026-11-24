"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import AudioPreview from "@/components/audio/audio-preview";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import JobStatus from "@/components/video/job-status";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import {
	AUDIO_FORMATS,
	AUDIO_MIME,
	type AudioFormat,
	audioTrimArgs,
} from "@/lib/video/audio";
import { runFfmpegJob } from "@/lib/video/ffmpeg-client";
import { type FfmpegCore, MAX_VIDEO_BYTES } from "@/lib/video/ffmpeg-core";
import { classifyFailure } from "@/lib/video/limits";
import { peaksFromSamples } from "@/lib/video/peaks";
import { AUDIO_ACCEPT, formatDuration, probeAudio } from "@/lib/video/probe";

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	url: string;
}

export default function TrimAudioTool() {
	const t = useTranslations("tools.trim-audio");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [duration, setDuration] = useState(0);
	const [range, setRange] = useState<[number, number]>([0, 1]);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [core, setCore] = useState<FfmpegCore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const peaks = useRef<number[]>([]);
	const format = useRef<AudioFormat>("mp3");
	const canvas = useRef<HTMLCanvasElement>(null);
	const frame = useRef<HTMLDivElement>(null);
	const dragging = useRef<"start" | "end" | null>(null);
	const urls = useRef<string[]>([]);

	const draw = () => {
		const target = canvas.current;
		if (!target) {
			return;
		}
		const width = target.clientWidth || 600;
		const height = 120;
		target.width = width;
		target.height = height;
		const context = target.getContext("2d");
		if (!context) {
			return;
		}
		context.clearRect(0, 0, width, height);
		const data = peaks.current;
		const bars = 120;
		const barWidth = width / bars;
		for (let index = 0; index < bars; index++) {
			const peak = data[Math.floor((index / bars) * data.length)] ?? 0;
			const barHeight = Math.max(2, peak * (height - 16));
			const center = index / bars;
			const inside = center >= range[0] && center <= range[1];
			context.fillStyle = inside ? "#1b56fd" : "rgba(148, 163, 184, 0.35)";
			context.fillRect(
				index * barWidth + 1,
				(height - barHeight) / 2,
				Math.max(1, barWidth - 2),
				barHeight,
			);
		}
	};

	useEffect(() => {
		draw();
		// redraws on every render, peaks and range live in refs and state.
	});

	const clearUrls = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
	};

	const reset = () => {
		clearUrls();
		peaks.current = [];
		setFile(null);
		setError(null);
		setResult(null);
		setProgress(null);
		setRange([0, 1]);
		setDuration(0);
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
			const probed = await probeAudio(picked);
			setDuration(probed.durationSec);
			const extension = picked.name
				.slice(picked.name.lastIndexOf(".") + 1)
				.toLowerCase();
			format.current = (AUDIO_FORMATS as string[]).includes(extension)
				? (extension as AudioFormat)
				: "mp3";
			const context = new AudioContext();
			try {
				const decoded = await context.decodeAudioData(
					await picked.arrayBuffer(),
				);
				const channels: Float32Array[] = [decoded.getChannelData(0)];
				if (decoded.numberOfChannels > 1) {
					channels.push(decoded.getChannelData(1));
				}
				peaks.current = peaksFromSamples(channels, 480);
			} finally {
				await context.close();
			}
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};
	const fractionAt = (clientX: number): number | null => {
		const box = frame.current?.getBoundingClientRect();
		if (!box || box.width === 0) {
			return null;
		}
		return Math.max(0, Math.min(1, (clientX - box.left) / box.width));
	};

	const apply = async () => {
		if (!file || duration <= 0 || running || loading) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		const startSec = range[0] * duration;
		const endSec = range[1] * duration;
		if (endSec - startSec < 0.1) {
			setError(te("generic"));
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		clearUrls();
		setProgress(null);
		try {
			const output = `out.${format.current}`;
			const job = await runFfmpegJob(
				(threads) =>
					audioTrimArgs(startSec, endSec - startSec, format.current, threads),
				[{ name: "in.audio", data: await file.arrayBuffer() }],
				[output],
				(ratio) => setProgress(Math.round(ratio * 100)),
			);
			setCore(job.core);
			const [out] = job.outputs;
			if (!out) {
				throw new Error("no output");
			}
			const mime = AUDIO_MIME[format.current];
			const filename = `${stemOf(file.name)}-trimmed.${format.current}`;
			const url = URL.createObjectURL(new Blob([out.data], { type: mime }));
			urls.current.push(url);
			setResult({ bytes: out.data, mime, filename, url });
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			const kind = classifyFailure(unknown);
			setError(
				kind === "engine"
					? tc("engineFailed")
					: kind === "memory"
						? te("outOfMemory")
						: te("unreadableFile"),
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
					accept={AUDIO_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running || loading}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				<AudioPreview file={file} label={file?.name ?? ""} />
				{file && duration > 0 ? (
					<div className="flex flex-col gap-2">
						<div
							ref={frame}
							data-testid="trim-frame"
							className="relative touch-none overflow-hidden rounded-lg border border-border select-none"
							onPointerDown={(event) => {
								const at = fractionAt(event.clientX);
								if (at === null) {
									return;
								}
								(event.target as HTMLElement).setPointerCapture?.(
									event.pointerId,
								);
								dragging.current =
									Math.abs(at - range[0]) <= Math.abs(at - range[1])
										? "start"
										: "end";
							}}
							onPointerMove={(event) => {
								if (!dragging.current) {
									return;
								}
								const at = fractionAt(event.clientX);
								if (at === null) {
									return;
								}
								if (dragging.current === "start") {
									setRange([Math.min(at, range[1] - 0.01), range[1]]);
								} else {
									setRange([range[0], Math.max(at, range[0] + 0.01)]);
								}
							}}
							onPointerUp={() => {
								dragging.current = null;
							}}
							onPointerCancel={() => {
								dragging.current = null;
							}}
						>
							<canvas className="block h-[120px] w-full" ref={canvas} />
							<div
								aria-hidden="true"
								className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500"
								data-testid="trim-start"
								style={{ left: `calc(${range[0] * 100}% - 2px)` }}
							/>
							<div
								aria-hidden="true"
								className="absolute top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500"
								data-testid="trim-end"
								style={{ left: `calc(${range[1] * 100}% - 2px)` }}
							/>
						</div>
						<p
							className="font-display text-small tabular-nums text-text-2"
							data-testid="trim-range"
						>
							{formatDuration(range[0] * duration)} –{" "}
							{formatDuration(range[1] * duration)}
						</p>
						<p className="text-small text-text-2">{t("options.dragHint")}</p>
					</div>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
						{/* biome-ignore lint/a11y/useMediaCaption: user-file preview, no captions exist */}
						<audio
							className="w-full"
							controls
							data-testid="audio-preview"
							src={result.url}
						/>
						<SmoothButton
							onClick={() =>
								downloadBytes(result.bytes, result.mime, result.filename)
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
						loadingLabel={tc("loadingAudioEngine")}
						progress={progress}
					/>
				) : null}
			</div>
		</div>
	);
}
