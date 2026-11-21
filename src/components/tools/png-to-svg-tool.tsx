"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import { distinctColors, PHOTO_COLOR_COUNT } from "@/lib/images/colors";
import { downloadBytes } from "@/lib/images/download";
import { MAX_IMAGE_BYTES, RASTER_ACCEPT, stemOf } from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import type { DecodedImage } from "@/workers/image-worker";

const TRACE_EDGE = 1024;
const PHOTO_WARN_BYTES = 500_000;

interface Result {
	svg: string;
	filename: string;
	url: string;
	size: number;
}

export default function PngToSvgTool() {
	const t = useTranslations("tools.png-to-svg");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [colors, setColors] = useState(6);
	const [smoothing, setSmoothing] = useState(50);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [photoLike, setPhotoLike] = useState(false);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const urls = useRef<string[]>([]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
		setFile(null);
		setError(null);
		setPhotoLike(false);
		setResult(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		const extension = picked.name
			.slice(picked.name.lastIndexOf(".") + 1)
			.toLowerCase();
		if (!["png", "jpg", "jpeg", "webp"].includes(extension)) {
			setFile(picked);
			setError(te("unsupported"));
			return;
		}
		if (picked.size > MAX_IMAGE_BYTES) {
			setFile(picked);
			setError(te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) }));
			return;
		}
		setFile(picked);
		setLoading(true);
		try {
			const worker = await imageWorker();
			const image = await worker.decodeInput(
				await picked.arrayBuffer(),
				picked.name,
			);
			decoded.current = image;
			setPhotoLike(
				distinctColors(image.image.data, PHOTO_COLOR_COUNT) >=
					PHOTO_COLOR_COUNT,
			);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	const apply = async () => {
		if (!file || !decoded.current || running) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		setRunning(true);
		setError(null);
		setResult(null);
		try {
			const worker = await imageWorker();
			const base = decoded.current;
			const scale = Math.min(1, TRACE_EDGE / Math.max(base.width, base.height));
			const traced =
				scale < 1
					? await worker.resizeImage(
							base.image,
							Math.max(1, Math.round(base.width * scale)),
							Math.max(1, Math.round(base.height * scale)),
						)
					: base.image;
			// smoothing 50 reproduces vtracer defaults (corner 60, speckle 6).
			const svg = await worker.tracePng(traced, {
				colors,
				corner: 10 + smoothing,
				speckle: 2 + Math.round(smoothing / 12),
			});
			const bytes = new TextEncoder().encode(svg);
			const filename = `${stemOf(file.name)}.svg`;
			const url = URL.createObjectURL(
				new Blob([bytes], { type: "image/svg+xml" }),
			);
			urls.current.push(url);
			setResult({ svg, filename, url, size: bytes.byteLength });
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={RASTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{photoLike && !result ? (
					<p className="text-small text-warn" role="status">
						{t("options.photoWarning")}
					</p>
				) : null}
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
							className="h-auto w-full rounded-lg bg-white"
							src={result.url}
						/>
						<p className="font-display text-small tabular-nums text-text-2">
							{t("options.resultSize")}: {formatBytes(result.size)}
						</p>
						{result.size > PHOTO_WARN_BYTES ? (
							<p className="text-small text-warn" role="alert">
								{t("options.photoWarning")}
							</p>
						) : null}
						<SmoothButton
							onClick={() =>
								downloadBytes(
									new TextEncoder().encode(result.svg).buffer as ArrayBuffer,
									"image/svg+xml",
									result.filename,
								)
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
				<p className="text-small text-text-2">{t("options.bestNote")}</p>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="trace-colors-label">
							{t("options.colors")}
						</span>
						<output
							aria-labelledby="trace-colors-label"
							className="font-display text-h3 tabular-nums"
						>
							{colors}
						</output>
					</div>
					<Slider
						aria-label={t("options.colors")}
						max={10}
						min={2}
						onValueChange={setColors}
						value={colors}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="trace-smoothing-label">
							{t("options.smoothing")}
						</span>
						<output
							aria-labelledby="trace-smoothing-label"
							className="font-display text-h3 tabular-nums"
						>
							{smoothing}
						</output>
					</div>
					<Slider
						aria-label={t("options.smoothing")}
						max={100}
						min={0}
						onValueChange={setSmoothing}
						value={smoothing}
					/>
				</div>
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
				{running ? (
					<ProgressRoot aria-label={t("options.apply")} value={null}>
						<ProgressTrack className="bg-surface-2" size="sm">
							<ProgressIndicator />
						</ProgressTrack>
					</ProgressRoot>
				) : null}
			</div>
		</div>
	);
}
