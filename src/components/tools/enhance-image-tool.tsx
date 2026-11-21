"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
import { downloadBytes } from "@/lib/images/download";
import { type EnhanceOptions, NEUTRAL_ENHANCE } from "@/lib/images/enhance";
import {
	MAX_IMAGE_BYTES,
	MAX_IMAGE_PIXELS,
	RASTER_ACCEPT,
	stemOf,
} from "@/lib/images/formats";
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

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	url: string;
}

export default function EnhanceImageTool() {
	const t = useTranslations("tools.enhance-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [options, setOptions] = useState<EnhanceOptions>(NEUTRAL_ENHANCE);
	const [preview, setPreview] = useState(false);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const previewBase = useRef<DecodedImage | null>(null);
	const format = useRef<Format>("png");
	const urls = useRef<string[]>([]);
	const canvas = useRef<HTMLCanvasElement>(null);
	const runId = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const drawPreview = async (next: EnhanceOptions) => {
		const base = previewBase.current;
		const target = canvas.current;
		if (!base || !target) {
			return;
		}
		const id = ++runId.current;
		try {
			const worker = await imageWorker();
			const adjusted = await worker.adjustImage(
				base.image,
				base.width,
				base.height,
				next,
			);
			if (runId.current !== id || !canvas.current) {
				return;
			}
			canvas.current.width = base.width;
			canvas.current.height = base.height;
			canvas.current.getContext("2d")?.putImageData(adjusted, 0, 0);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
		}
	};

	const queuePreview = (next: EnhanceOptions) => {
		setOptions(next);
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(() => drawPreview(next), 120);
	};

	useEffect(() => {
		if (preview) {
			drawPreview(optionsRef.current);
		}
		// drawPreview is stable worker plumbing, preview gates the canvas mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [preview]);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
		previewBase.current = null;
		setFile(null);
		setPreview(false);
		setError(null);
		setResult(null);
		setOptions(NEUTRAL_ENHANCE);
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
			const scale = Math.min(
				1,
				PREVIEW_EDGE / Math.max(image.width, image.height),
			);
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
			drawPreview(NEUTRAL_ENHANCE);
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
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
			const base = decoded.current;
			const adjusted = await worker.adjustImage(
				base.image,
				base.width,
				base.height,
				options,
			);
			const encoded = await worker.encodeImage(
				adjusted,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			const filename = `${stemOf(file.name)}-enhanced.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({ bytes: encoded.bytes, mime: encoded.mime, filename, url });
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
		}
	};

	const sliders: Array<{
		key: keyof EnhanceOptions;
		label: string;
		min: number;
		max: number;
	}> = [
		{ key: "brightness", label: t("options.brightness"), min: -100, max: 100 },
		{ key: "contrast", label: t("options.contrast"), min: -100, max: 100 },
		{ key: "saturation", label: t("options.saturation"), min: -100, max: 100 },
		{ key: "sharpness", label: t("options.sharpness"), min: 0, max: 100 },
	];

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
						data-testid="enhance-preview"
						ref={canvas}
					/>
				) : null}
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{result ? (
					<div className="flex flex-col gap-3 border border-border bg-surface p-5">
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
				{sliders.map((slider) => (
					<div className="flex flex-col gap-2" key={slider.key}>
						<div className="flex items-center justify-between gap-2">
							<span
								className="text-small font-medium"
								id={`enhance-${slider.key}-label`}
							>
								{slider.label}
							</span>
							<output
								aria-labelledby={`enhance-${slider.key}-label`}
								className="font-display text-h3 tabular-nums"
							>
								{options[slider.key]}
							</output>
						</div>
						<Slider
							aria-label={slider.label}
							max={slider.max}
							min={slider.min}
							onValueChange={(value) =>
								queuePreview({ ...options, [slider.key]: value })
							}
							value={options[slider.key]}
						/>
					</div>
				))}
				<div className="flex gap-2">
					<SmoothButton
						className="w-full"
						onClick={() => {
							setOptions(NEUTRAL_ENHANCE);
							drawPreview(NEUTRAL_ENHANCE);
						}}
						size="lg"
						variant="secondary"
					>
						{t("options.reset")}
					</SmoothButton>
					<SmoothButton
						className="w-full"
						loading={running}
						onClick={apply}
						size="lg"
					>
						{t("options.apply")}
					</SmoothButton>
				</div>
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
