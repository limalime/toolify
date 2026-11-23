"use client";

import * as Comlink from "comlink";
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
import { cn } from "@/lib/utils";
import { audioJoinArgs } from "@/lib/video/audio";
import { ffmpegLoaded } from "@/lib/video/ffmpeg-client";
import {
	type FfmpegCore,
	MAX_VIDEO_BYTES,
	threadCount,
} from "@/lib/video/ffmpeg-core";
import { AUDIO_ACCEPT } from "@/lib/video/probe";

const MAX_JOIN_FILES = 10;

interface Track {
	id: string;
	file: File;
}

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	url: string;
}

export default function JoinAudioTool() {
	const t = useTranslations("tools.join-audio");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [tracks, setTracks] = useState<Track[]>([]);
	const [format, setFormat] = useState("mp3");
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<number | null>(null);
	const [core, setCore] = useState<FfmpegCore | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const urls = useRef<string[]>([]);
	const counter = useRef(0);
	const dragging = useRef<string | null>(null);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		setError(null);
		setResult(null);
		setProgress(null);
	};

	const addFiles = async (files: File[]) => {
		reset();
		const accepted: Track[] = [];
		for (const picked of files.slice(0, MAX_JOIN_FILES)) {
			if (picked.size > MAX_VIDEO_BYTES) {
				setError(te("tooLarge", { limit: formatBytes(MAX_VIDEO_BYTES) }));
				return;
			}
			counter.current += 1;
			accepted.push({ id: `track-${counter.current}`, file: picked });
		}
		setTracks((current) => [...current, ...accepted].slice(0, MAX_JOIN_FILES));
	};

	const move = (from: number, to: number) => {
		setTracks((current) => {
			if (
				from < 0 ||
				to < 0 ||
				from >= current.length ||
				to >= current.length
			) {
				return current;
			}
			const next = [...current];
			const [moved] = next.splice(from, 1);
			if (moved) {
				next.splice(to, 0, moved);
			}
			return next;
		});
	};

	const apply = async () => {
		if (tracks.length < 2 || running) {
			notify.warning(
				tracks.length === 0 ? tc("needFiles") : t("options.needTwo"),
			);
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
			const inputs = [];
			for (const [index, track] of tracks.entries()) {
				inputs.push({
					name: `in${index}.audio`,
					data: await track.file.arrayBuffer(),
				});
			}
			const outputName = format === "wav" ? "out.wav" : "out.mp3";
			const [out] = await worker.runFfmpeg(
				audioJoinArgs(tracks.length, threads, format === "wav" ? "wav" : "mp3"),
				inputs,
				[outputName],
				Comlink.proxy((ratio: number) => {
					setProgress(Math.round(ratio * 100));
				}),
			);
			if (!out) {
				throw new Error("no output");
			}
			const mime = format === "wav" ? "audio/wav" : "audio/mpeg";
			const filename = `joined.${format}`;
			const url = URL.createObjectURL(new Blob([out.data], { type: mime }));
			urls.current.push(url);
			setResult({ bytes: out.data, mime, filename, url });
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
					disabled={running}
					hint={tc("dropHint")}
					multiple
					onFiles={addFiles}
				/>
				{tracks.length > 0 ? (
					<div className="flex flex-col gap-2">
						<span className="text-small text-text-2">
							{t("options.reorder")}
						</span>
						<ol className="flex flex-col gap-2">
							{tracks.map((track, index) => (
								<li
									className={cn(
										"flex cursor-grab items-center gap-3 rounded-lg border border-border bg-surface p-3 text-small active:cursor-grabbing",
									)}
									data-testid={`join-track-${index}`}
									draggable={!running}
									key={track.id}
									onDragEnd={() => {
										dragging.current = null;
									}}
									onDragOver={(event) => event.preventDefault()}
									onDragStart={() => {
										dragging.current = track.id;
									}}
									onDrop={(event) => {
										event.preventDefault();
										const from = tracks.findIndex(
											(item) => item.id === dragging.current,
										);
										move(from, index);
										dragging.current = null;
									}}
								>
									<span className="font-display tabular-nums text-text-2">
										{index + 1}
									</span>
									<span className="min-w-0 flex-1 truncate">
										{track.file.name}
									</span>
									<span className="shrink-0 tabular-nums text-text-2">
										{formatBytes(track.file.size)}
									</span>
								</li>
							))}
						</ol>
						<div className="grid gap-2 md:grid-cols-2">
							{tracks.map((track) => (
								<AudioPreview
									file={track.file}
									key={track.id}
									label={track.file.name}
								/>
							))}
						</div>
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
				<Field>
					<FieldLabel htmlFor="join-format">{t("options.format")}</FieldLabel>
					<Select
						aria-label={t("options.format")}
						className={selectTriggerClass}
						onValueChange={setFormat}
						options={[
							{ label: "MP3", value: "mp3" },
							{ label: "WAV", value: "wav" },
						]}
						value={format}
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
						loadingLabel={tc("loadingAudioEngine")}
						progress={progress}
					/>
				) : null}
			</div>
		</div>
	);
}
