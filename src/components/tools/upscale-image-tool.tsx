"use client";

import * as Comlink from "comlink";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import SmoothButton from "@/components/smoothui/smooth-button";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { tabActiveClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import { MAX_IMAGE_BYTES, RASTER_ACCEPT, stemOf } from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import { ORT_WASM_BASE, UPSCALE_MODEL_URL } from "@/lib/r2";
import type { DecodedImage } from "@/workers/image-worker";

type Format = "png" | "jpg" | "webp" | "avif";

const FORMAT_OF: Record<string, Format> = {
	png: "png",
	jpg: "jpg",
	jpeg: "jpg",
	webp: "webp",
	avif: "avif",
};

const OUTPUT_QUALITY: Record<Format, number> = {
	png: 100,
	jpg: 92,
	webp: 90,
	avif: 80,
};

const MAX_UPSCALE_EDGE = 2048;
const MAX_UPSCALE_PIXELS = 4_000_000;

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	width: number;
	height: number;
	url: string;
	device: string;
}

export default function UpscaleImageTool() {
	const t = useTranslations("tools.upscale-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [scale, setScale] = useState<"2" | "4">("4");
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<{
		stage: string;
		current: number;
		total: number;
	} | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const format = useRef<Format>("png");
	const urls = useRef<string[]>([]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
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
		const extension = picked.name
			.slice(picked.name.lastIndexOf(".") + 1)
			.toLowerCase();
		if (!FORMAT_OF[extension]) {
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
			if (
				image.width > MAX_UPSCALE_EDGE ||
				image.height > MAX_UPSCALE_EDGE ||
				image.width * image.height > MAX_UPSCALE_PIXELS
			) {
				setError(te("tooLarge", { limit: "2048 px, 4 MP" }));
				return;
			}
			decoded.current = image;
			format.current = FORMAT_OF[extension] as Format;
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
		setProgress({ stage: "download", current: 0, total: 1 });
		try {
			const worker = await imageWorker();
			const base = decoded.current;
			const upscaled = await worker.upscaleImage(
				base.image,
				{
					modelUrl: UPSCALE_MODEL_URL,
					wasmBase: ORT_WASM_BASE,
					scale: scale === "2" ? 2 : 4,
				},
				Comlink.proxy((stage: string, current: number, total: number) => {
					setProgress({ stage, current, total });
				}),
			);
			const encoded = await worker.encodeImage(
				upscaled.image,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			const filename = `${stemOf(file.name)}-${scale}x.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({
				bytes: encoded.bytes,
				mime: encoded.mime,
				filename,
				width: upscaled.width,
				height: upscaled.height,
				url,
				device:
					upscaled.device === "webgpu"
						? t("options.usedWebgpu")
						: t("options.usedCpu"),
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

	const percent =
		progress && progress.total > 0
			? Math.round((progress.current / progress.total) * 100)
			: null;

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
						<p className="font-display text-small tabular-nums text-text-2">
							{result.width} × {result.height} · {result.device}
						</p>
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
				<div className="flex flex-col gap-2">
					<span className="text-small font-medium" id="upscale-scale-label">
						{t("options.scale")}
					</span>
					<TabsRoot
						defaultValue="4"
						onValueChange={(value) => setScale(value as "2" | "4")}
					>
						<TabsList aria-labelledby="upscale-scale-label">
							<TabsTab className={tabActiveClass} value="2">
								{t("options.scale2")}
							</TabsTab>
							<TabsTab className={tabActiveClass} value="4">
								{t("options.scale4")}
							</TabsTab>
							<TabsIndicator />
						</TabsList>
					</TabsRoot>
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
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<span
								className="text-small text-text-2"
								data-testid="upscale-stage"
							>
								{progress?.stage === "upscale"
									? t("options.working")
									: t("options.downloading")}
							</span>
							{percent !== null ? (
								<output className="font-display text-small tabular-nums">
									{percent}%
								</output>
							) : null}
						</div>
						<ProgressRoot aria-label={t("options.apply")} value={percent}>
							<ProgressTrack className="bg-surface-2" size="sm">
								<ProgressIndicator />
							</ProgressTrack>
						</ProgressRoot>
					</div>
				) : null}
			</div>
		</div>
	);
}
