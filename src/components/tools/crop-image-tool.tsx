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
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import {
	clampSelection,
	constrainAspect,
	type Selection,
	selectionFromCorners,
	selectionPixels,
} from "@/lib/images/crop";
import { downloadBytes } from "@/lib/images/download";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import { cn } from "@/lib/utils";
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

const PRESETS: Array<{ key: string; ratio: number | null }> = [
	{ key: "free", ratio: null },
	{ key: "1:1", ratio: 1 },
	{ key: "4:3", ratio: 4 / 3 },
	{ key: "3:4", ratio: 3 / 4 },
	{ key: "16:9", ratio: 16 / 9 },
	{ key: "9:16", ratio: 9 / 16 },
];

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	width: number;
	height: number;
	url: string;
}

export default function CropImageTool() {
	const t = useTranslations("tools.crop-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [dims, setDims] = useState<{ width: number; height: number } | null>(
		null,
	);
	const [selection, setSelection] = useState<Selection>({
		x: 0.1,
		y: 0.1,
		width: 0.8,
		height: 0.8,
	});
	const [preset, setPreset] = useState<string>("free");
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const format = useRef<Format>("png");
	const frame = useRef<HTMLDivElement>(null);
	const dragging = useRef<{ x: number; y: number } | null>(null);
	const urls = useRef<string[]>([]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
		setFile(null);
		setPreview(null);
		setError(null);
		setResult(null);
		setSelection({ x: 0.1, y: 0.1, width: 0.8, height: 0.8 });
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
		try {
			const worker = await imageWorker();
			const image = await worker.decodeInput(
				await picked.arrayBuffer(),
				picked.name,
			);
			if (image.width * image.height > MAX_IMAGE_PIXELS) {
				setError(te("tooLarge", { limit: "64 MP" }));
				return;
			}
			decoded.current = image;
			format.current = FORMAT_OF[extension] as Format;
			setDims({ width: image.width, height: image.height });
			const url = URL.createObjectURL(picked);
			urls.current.push(url);
			setPreview(url);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		}
	};

	const toFractions = (clientX: number, clientY: number) => {
		const box = frame.current?.getBoundingClientRect();
		if (!box || box.width === 0 || box.height === 0) {
			return null;
		}
		return {
			x: (clientX - box.left) / box.width,
			y: (clientY - box.top) / box.height,
		};
	};

	const applyPreset = (key: string, ratio: number | null) => {
		setPreset(key);
		if (ratio && dims) {
			// presets describe output pixels, selections live in fractions.
			setSelection((current) =>
				constrainAspect(current, (ratio * dims.height) / dims.width),
			);
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
		try {
			const worker = await imageWorker();
			const box = selectionPixels(
				selection,
				decoded.current.width,
				decoded.current.height,
			);
			const cut = await worker.cropImage(
				decoded.current.image,
				box.x,
				box.y,
				box.width,
				box.height,
			);
			const encoded = await worker.encodeImage(
				cut,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			const filename = `${stemOf(file.name)}-cropped.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({
				bytes: encoded.bytes,
				mime: encoded.mime,
				filename,
				width: box.width,
				height: box.height,
				url,
			});
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
				{preview ? (
					<div
						ref={frame}
						data-testid="crop-frame"
						className="relative cursor-crosshair touch-none overflow-hidden rounded-lg border border-border select-none"
						onPointerDown={(event) => {
							const point = toFractions(event.clientX, event.clientY);
							if (!point) {
								return;
							}
							(event.target as HTMLElement).setPointerCapture?.(
								event.pointerId,
							);
							dragging.current = point;
							const active =
								PRESETS.find((entry) => entry.key === preset)?.ratio ?? null;
							const next = clampSelection(
								selectionFromCorners(point.x, point.y, point.x, point.y),
							);
							setSelection(
								active && dims
									? constrainAspect(next, (active * dims.height) / dims.width)
									: next,
							);
						}}
						onPointerMove={(event) => {
							const start = dragging.current;
							const point = toFractions(event.clientX, event.clientY);
							if (!start || !point) {
								return;
							}
							const active =
								PRESETS.find((entry) => entry.key === preset)?.ratio ?? null;
							const next = clampSelection(
								selectionFromCorners(start.x, start.y, point.x, point.y),
							);
							setSelection(
								active && dims
									? constrainAspect(next, (active * dims.height) / dims.width)
									: next,
							);
						}}
						onPointerUp={() => {
							dragging.current = null;
						}}
						onPointerCancel={() => {
							dragging.current = null;
						}}
					>
						{/* biome-ignore lint/performance/noImgElement: blob url, next-image cannot optimize object urls */}
						<img
							alt={file?.name ?? "preview"}
							className="pointer-events-none block h-auto w-full"
							src={preview}
						/>
						<div
							aria-hidden="true"
							data-testid="crop-selection"
							className="absolute border-2 border-blue-500 shadow-glow"
							style={{
								left: `${selection.x * 100}%`,
								top: `${selection.y * 100}%`,
								width: `${selection.width * 100}%`,
								height: `${selection.height * 100}%`,
								boxShadow:
									"0 0 0 9999px rgb(0 0 0 / 0.55), 0 0 24px rgb(27 86 253 / 0.25)",
							}}
						/>
					</div>
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
							className="h-auto w-full rounded-lg"
							src={result.url}
						/>
						<p className="font-display text-small tabular-nums text-text-2">
							{result.width} × {result.height}
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
					<fieldset className="flex flex-wrap gap-2">
						<legend className="text-small font-medium">
							{t("options.aspect")}
						</legend>
						{PRESETS.map((entry) => (
							<button
								key={entry.key}
								type="button"
								aria-pressed={preset === entry.key}
								onClick={() => applyPreset(entry.key, entry.ratio)}
								className={cn(
									"min-h-11 cursor-pointer rounded-lg border px-3 text-small outline-none transition-colors focus-visible:border-blue-500",
									preset === entry.key
										? "border-blue-500 text-blue-500 shadow-glow"
										: "border-border bg-surface-2 text-text-2 hover:text-text",
								)}
							>
								{entry.key === "free" ? t("options.free") : entry.key}
							</button>
						))}
					</fieldset>
				</div>
				<SmoothButton
					className="w-full"
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
