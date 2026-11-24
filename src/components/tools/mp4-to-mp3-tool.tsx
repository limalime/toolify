"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import AudioPreview from "@/components/audio/audio-preview";
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
import { mp3Args } from "@/lib/video/commands";
import { runFfmpegJob } from "@/lib/video/ffmpeg-client";
import type { FfmpegCore } from "@/lib/video/ffmpeg-core";
import {
	checkVideoFile,
	classifyFailure,
	videoFormat,
} from "@/lib/video/limits";
import { VIDEO_ACCEPT } from "@/lib/video/probe";

const BITRATES = [128, 192, 256, 320];

interface Result {
	bytes: ArrayBuffer;
	filename: string;
	url: string;
}

export default function Mp4ToMp3Tool() {
	const t = useTranslations("tools.mp4-to-mp3");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [bitrate, setBitrate] = useState("192");
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [core, setCore] = useState<FfmpegCore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const urls = useRef<string[]>([]);

	const clearUrls = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
	};

	const reset = () => {
		clearUrls();
		setFile(null);
		setError(null);
		setResult(null);
		setProgress(null);
	};

	// audio extraction needs no browser preview, so mov and 3gp files
	// go straight to the engine.
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
	};

	const apply = async () => {
		if (!file || running) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		clearUrls();
		setProgress(null);
		try {
			const job = await runFfmpegJob(
				(threads) => mp3Args(Number(bitrate), threads),
				[{ name: "in.mp4", data: await file.arrayBuffer() }],
				["out.mp3"],
				(ratio) => setProgress(Math.round(ratio * 100)),
			);
			setCore(job.core);
			const [out] = job.outputs;
			if (!out) {
				throw new Error("no output");
			}
			const filename = `${stemOf(file.name)}.mp3`;
			const url = URL.createObjectURL(
				new Blob([out.data], { type: "audio/mpeg" }),
			);
			urls.current.push(url);
			setResult({ bytes: out.data, filename, url });
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
					disabled={running}
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
				<Field>
					<FieldLabel htmlFor="mp3-bitrate">{t("options.bitrate")}</FieldLabel>
					<Select
						aria-label={t("options.bitrate")}
						className={selectTriggerClass}
						onValueChange={setBitrate}
						options={BITRATES.map((rate) => ({
							label: `${rate}k`,
							value: String(rate),
						}))}
						value={bitrate}
					/>
				</Field>
				<SmoothButton
					className="w-full"
					disabled={running}
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
