"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import { inputClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
import { rasterizeTextMark } from "@/lib/images/watermark";
import { imageWorker } from "@/lib/images/worker-client";
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

const PREVIEW_EDGE = 640;

async function stamp(
	base: ImageData,
	width: number,
	height: number,
	top: string,
	bottom: string,
	fontSize: number,
): Promise<ImageData> {
	const worker = await imageWorker();
	let out = base;
	const captions = [
		{ text: top.trim(), place: "top" },
		{ text: bottom.trim(), place: "bottom" },
	] as const;
	for (const caption of captions) {
		if (!caption.text) {
			continue;
		}
		const mark = rasterizeTextMark(caption.text, fontSize);
		const x = Math.round((width - mark.width) / 2);
		const y =
			caption.place === "top" ? 16 : Math.max(0, height - mark.height - 16);
		out = await worker.compositeImage(out, mark.data, x, y, 1);
	}
	return out;
}

export default function MemeGeneratorTool() {
	const t = useTranslations("tools.meme-generator");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [top, setTop] = useState("");
	const [bottom, setBottom] = useState("");
	const [fontSize, setFontSize] = useState(64);
	const [loading, setLoading] = useState(false);
	const [preview, setPreview] = useState(false);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const previewBase = useRef<DecodedImage | null>(null);
	const previewScale = useRef(1);
	const format = useRef<Format>("png");
	const canvas = useRef<HTMLCanvasElement>(null);
	const runId = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const draft = useRef({ top: "", bottom: "", fontSize: 64 });
	draft.current = { top, bottom, fontSize };

	const drawPreview = async () => {
		const base = previewBase.current;
		if (!base || !canvas.current) {
			return;
		}
		const id = ++runId.current;
		const { top: topText, bottom: bottomText, fontSize: size } = draft.current;
		try {
			const stamped = await stamp(
				base.image,
				base.width,
				base.height,
				topText,
				bottomText,
				Math.max(8, Math.round(size * previewScale.current)),
			);
			if (runId.current !== id || !canvas.current) {
				return;
			}
			canvas.current.width = base.width;
			canvas.current.height = base.height;
			canvas.current.getContext("2d")?.putImageData(stamped, 0, 0);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
		}
	};

	const queuePreview = () => {
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(drawPreview, 150);
	};

	// drawPreview reads the draft ref, preview gates the canvas mount.
	// biome-ignore lint/correctness/useExhaustiveDependencies: preview-only trigger by design
	useEffect(() => {
		if (preview) {
			drawPreview();
		}
	}, [preview]);

	const reset = () => {
		decoded.current = null;
		previewBase.current = null;
		setFile(null);
		setPreview(false);
		setError(null);
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
			if (image.width * image.height > MAX_IMAGE_PIXELS) {
				setError(te("tooLarge", { limit: "64 MP" }));
				return;
			}
			decoded.current = image;
			format.current = FORMAT_OF[extension] as Format;
			const scale = Math.min(
				1,
				PREVIEW_EDGE / Math.max(image.width, image.height),
			);
			previewScale.current = scale;
			const small = await worker.resizeImage(
				image.image,
				Math.max(1, Math.round(image.width * scale)),
				Math.max(1, Math.round(image.height * scale)),
			);
			previewBase.current = {
				image: small,
				width: small.width,
				height: small.height,
			};
			setPreview(true);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	const download = async () => {
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
			const base = decoded.current;
			const stamped = await stamp(
				base.image,
				base.width,
				base.height,
				top,
				bottom,
				fontSize,
			);
			const encoded = await worker.encodeImage(
				stamped,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			downloadBytes(
				encoded.bytes,
				encoded.mime,
				`${stemOf(file.name)}-meme.${encoded.extension}`,
			);
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
				{file && preview ? (
					<canvas
						className="h-auto w-full rounded-lg border border-border"
						data-testid="meme-preview"
						ref={canvas}
					/>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="meme-top">{t("options.top")}</FieldLabel>
					<FieldControl
						autoComplete="off"
						className={inputClass}
						id="meme-top"
						onChange={(event) => {
							setTop(event.target.value);
							queuePreview();
						}}
						placeholder={t("options.topPlaceholder")}
						value={top}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="meme-bottom">{t("options.bottom")}</FieldLabel>
					<FieldControl
						autoComplete="off"
						className={inputClass}
						id="meme-bottom"
						onChange={(event) => {
							setBottom(event.target.value);
							queuePreview();
						}}
						placeholder={t("options.bottomPlaceholder")}
						value={bottom}
					/>
				</Field>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span className="text-small font-medium" id="meme-size-label">
							{t("options.fontSize")}
						</span>
						<output
							aria-labelledby="meme-size-label"
							className="font-display text-h3 tabular-nums"
						>
							{fontSize}
						</output>
					</div>
					<Slider
						aria-label={t("options.fontSize")}
						max={200}
						min={12}
						onValueChange={(value) => {
							setFontSize(value);
							queuePreview();
						}}
						value={fontSize}
					/>
				</div>
				<SmoothButton
					className="w-full"
					disabled={running || loading}
					loading={running}
					onClick={download}
					size="lg"
				>
					{t("options.download")}
				</SmoothButton>
				{running ? (
					<ProgressRoot aria-label={t("options.download")} value={null}>
						<ProgressTrack className="bg-surface-2" size="sm">
							<ProgressIndicator />
						</ProgressTrack>
					</ProgressRoot>
				) : null}
			</div>
		</div>
	);
}
