"use client";

import * as Comlink from "comlink";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import AudioPreview from "@/components/audio/audio-preview";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import JobStatus from "@/components/video/job-status";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import { speedPitchArgs } from "@/lib/video/audio";
import { ffmpegLoaded } from "@/lib/video/ffmpeg-client";
import {
	type FfmpegCore,
	MAX_VIDEO_BYTES,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import { AUDIO_ACCEPT, probeAudio, type VideoMeta } from "@/lib/video/probe";

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	url: string;
}

export default function AudioSpeedTool() {
	const t = useTranslations("tools.audio-speed");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [speed, setSpeed] = useState(100);
	const [pitch, setPitch] = useState(0);
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
			meta.current = await probeAudio(picked);
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
				speedPitchArgs(speed / 100, pitch, threads),
				[{ name: "in.audio", data: await file.arrayBuffer() }],
				["out.mp3"],
				Comlink.proxy((ratio: number) => {
					setProgress(Math.round(ratio * 100));
				}),
			);
			if (!out) {
				throw new Error("no output");
			}
			const filename = `${stemOf(file.name)}-${speed}pct.mp3`;
			const url = URL.createObjectURL(
				new Blob([out.data], { type: "audio/mpeg" }),
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
					accept={AUDIO_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running || loading}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				<AudioPreview file={file} label={file?.name ?? ""} />
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
								downloadBytes(result.bytes, "audio/mpeg", result.filename)
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
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="speed-label">
							{t("options.speed")}
						</span>
						<output
							aria-labelledby="speed-label"
							className="font-display text-h3 tabular-nums"
						>
							{speed}%
						</output>
					</div>
					<Slider
						aria-label={t("options.speed")}
						max={200}
						min={50}
						onValueChange={setSpeed}
						value={speed}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="pitch-label">
							{t("options.pitch")}
						</span>
						<output
							aria-labelledby="pitch-label"
							className="font-display text-h3 tabular-nums"
						>
							{pitch > 0 ? `+${pitch}` : pitch} {t("options.semitones")}
						</output>
					</div>
					<Slider
						aria-label={t("options.pitch")}
						max={12}
						min={-12}
						onValueChange={setPitch}
						value={pitch}
					/>
				</div>
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
