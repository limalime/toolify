"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import { selectTriggerClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBlob } from "@/lib/images/download";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";
import {
	ASCII_PRESETS,
	type AsciiCharset,
	type AsciiPreset,
	type AsciiResult,
	asciiText,
	imageToAscii,
} from "@/lib/text/ascii-image";
import { copyText } from "@/lib/text/clipboard";
import type { DecodedImage } from "@/workers/image-worker";

const PRESETS: AsciiPreset[] = ["classic", "matrix", "blueprint", "paper"];
const CHARSETS: AsciiCharset[] = ["classic", "detailed", "blocks"];
const CELL_WIDTH = 0.6;

function paint(
	canvas: HTMLCanvasElement,
	result: AsciiResult,
	preset: AsciiPreset,
	scale: number,
) {
	const size = 16 * scale;
	const charWidth = size * CELL_WIDTH;
	const lineHeight = size;
	canvas.width = Math.max(1, Math.round(result.cols * charWidth));
	canvas.height = Math.max(1, Math.round(result.rows * lineHeight));
	const context = canvas.getContext("2d");
	if (!context) {
		return;
	}
	context.fillStyle = ASCII_PRESETS[preset].background;
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
	context.textBaseline = "top";
	for (let row = 0; row < result.rows; row += 1) {
		const line = result.lines[row];
		if (!line) {
			continue;
		}
		for (let col = 0; col < result.cols; col += 1) {
			const cell = line[col];
			if (!cell || cell.char === " " || cell.color === "transparent") {
				continue;
			}
			context.fillStyle = cell.color;
			context.fillText(cell.char, col * charWidth, row * lineHeight);
		}
	}
}

export default function AsciiImageTool() {
	const t = useTranslations("tools.ascii-art");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [sourceUrl, setSourceUrl] = useState<string | null>(null);
	const [preset, setPreset] = useState<AsciiPreset>("classic");
	const [charset, setCharset] = useState<AsciiCharset>("classic");
	const [contrast, setContrast] = useState(0);
	const [width, setWidth] = useState(110);
	const [color, setColor] = useState(true);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<AsciiResult | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const url = useRef<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const reset = () => {
		if (url.current) {
			URL.revokeObjectURL(url.current);
			url.current = null;
		}
		decoded.current = null;
		setFile(null);
		setSourceUrl(null);
		setResult(null);
		setError(null);
	};

	const generate = useCallback(async () => {
		const base = decoded.current;
		if (!base) {
			return;
		}
		setRunning(true);
		try {
			const rows = Math.max(
				1,
				Math.round(width * (base.height / base.width) * CELL_WIDTH),
			);
			const worker = await imageWorker();
			const small = await worker.resizeImage(base.image, width, rows);
			setResult(
				imageToAscii(small.data, small.width, small.height, {
					charset,
					contrast,
					preset,
					color,
				}),
			);
		} catch {
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
		}
	}, [charset, color, contrast, preset, te, width]);

	useEffect(() => {
		if (!decoded.current) {
			return;
		}
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(generate, 180);
		return () => {
			if (timer.current) {
				clearTimeout(timer.current);
			}
		};
	}, [generate]);

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		setFile(picked);
		const preview = URL.createObjectURL(picked);
		url.current = preview;
		setSourceUrl(preview);
		if (picked.size > MAX_IMAGE_BYTES) {
			setError(te("tooLarge", { limit: formatBytes(MAX_IMAGE_BYTES) }));
			return;
		}
		setLoading(true);
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
			await generate();
		} catch {
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (result && canvas.current) {
			paint(canvas.current, result, preset, 1);
		}
	}, [preset, result]);

	const copy = async () => {
		if (!result) {
			return;
		}
		if (await copyText(asciiText(result))) {
			notify.success(tc("copied"));
		} else {
			notify.error(tc("copy"), t("options.needImage"));
		}
	};

	const download = (format: "png" | "jpg") => {
		if (!result || !file) {
			notify.warning(t("options.needImage"));
			return;
		}
		const out = document.createElement("canvas");
		paint(out, result, preset, 2);
		out.toBlob(
			(blob) => {
				if (blob) {
					downloadBlob(blob, `${stemOf(file.name)}-ascii.${format}`);
				}
			},
			format === "png" ? "image/png" : "image/jpeg",
			0.92,
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={RASTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running || loading}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{file && sourceUrl ? (
					<div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
						{/* biome-ignore lint/performance/noImgElement: local blob preview, next-image cannot optimize object urls */}
						<img
							alt={file.name}
							className="size-16 rounded-md object-cover"
							src={sourceUrl}
						/>
						<div className="flex min-w-0 flex-col">
							<span className="truncate text-small text-text">{file.name}</span>
							<span className="text-caption text-text-3">
								{formatBytes(file.size)}
							</span>
						</div>
					</div>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
						<canvas
							className="h-auto w-full rounded-md"
							data-testid="ascii-image-preview"
							ref={canvas}
						/>
						<div className="flex flex-wrap gap-2">
							<SmoothButton onClick={copy} size="sm" variant="secondary">
								{t("options.copyText")}
							</SmoothButton>
							<SmoothButton
								onClick={() => download("png")}
								size="sm"
								variant="secondary"
							>
								{t("options.downloadPng")}
							</SmoothButton>
							<SmoothButton
								onClick={() => download("jpg")}
								size="sm"
								variant="secondary"
							>
								{t("options.downloadJpg")}
							</SmoothButton>
						</div>
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="ascii-preset">{t("options.preset")}</FieldLabel>
					<Select
						aria-label={t("options.preset")}
						className={selectTriggerClass}
						onValueChange={(value) => setPreset(value as AsciiPreset)}
						options={PRESETS.map((entry) => ({
							label: t(`options.preset${entry[0]?.toUpperCase()}${entry.slice(1)}`),
							value: entry,
						}))}
						value={preset}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="ascii-charset">{t("options.charset")}</FieldLabel>
					<Select
						aria-label={t("options.charset")}
						className={selectTriggerClass}
						onValueChange={(value) => setCharset(value as AsciiCharset)}
						options={CHARSETS.map((entry) => ({
							label: t(`options.charset${entry[0]?.toUpperCase()}${entry.slice(1)}`),
							value: entry,
						}))}
						value={charset}
					/>
				</Field>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="ascii-width-label">
							{t("options.width")}
						</span>
						<output
							aria-labelledby="ascii-width-label"
							className="font-display text-h3 tabular-nums"
						>
							{width}
						</output>
					</div>
					<Slider
						aria-label={t("options.width")}
						max={180}
						min={40}
						onValueChange={setWidth}
						value={width}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="ascii-contrast-label">
							{t("options.contrast")}
						</span>
						<output
							aria-labelledby="ascii-contrast-label"
							className="font-display text-h3 tabular-nums"
						>
							{contrast}
						</output>
					</div>
					<Slider
						aria-label={t("options.contrast")}
						max={100}
						min={-100}
						onValueChange={setContrast}
						value={contrast}
					/>
				</div>
				<div className="flex items-center justify-between gap-3">
					<span className="text-small font-medium">{t("options.color")}</span>
					<Switch
						aria-label={t("options.color")}
						checked={color}
						onCheckedChange={setColor}
					/>
				</div>
			</div>
		</div>
	);
}