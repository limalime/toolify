"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
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
import Switch from "@/components/smoothui/switch";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import { formatBytes } from "@/lib/format";
import { downloadBytes } from "@/lib/images/download";
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

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	extension: string;
	filename: string;
	width: number;
	height: number;
	url: string;
}

export default function ResizeImageTool() {
	const t = useTranslations("tools.resize-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [dims, setDims] = useState<{ width: number; height: number } | null>(
		null,
	);
	const [mode, setMode] = useState("pixels");
	const [width, setWidth] = useState("");
	const [height, setHeight] = useState("");
	const [percent, setPercent] = useState(100);
	const [keepRatio, setKeepRatio] = useState(true);
	const [loading, setLoading] = useState(false);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const format = useRef<Format>("png");
	const urls = useRef<string[]>([]);

	const reset = (next: File | null) => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
		setFile(next);
		setDims(null);
		setError(null);
		setResult(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset(null);
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
			setDims({ width: image.width, height: image.height });
			setWidth(String(image.width));
			setHeight(String(image.height));
		} catch (unknown) {
			if (process.env.NODE_ENV !== "production") {
				console.error(unknown);
			}
			setError(te("unreadableFile"));
		} finally {
			setLoading(false);
		}
	};

	const onWidth = (value: string) => {
		setWidth(value);
		if (keepRatio && dims) {
			const parsed = Number.parseInt(value, 10);
			if (Number.isFinite(parsed) && parsed > 0) {
				setHeight(
					String(Math.max(1, Math.round((parsed * dims.height) / dims.width))),
				);
			}
		}
	};

	const onHeight = (value: string) => {
		setHeight(value);
		if (keepRatio && dims) {
			const parsed = Number.parseInt(value, 10);
			if (Number.isFinite(parsed) && parsed > 0) {
				setWidth(
					String(Math.max(1, Math.round((parsed * dims.width) / dims.height))),
				);
			}
		}
	};

	const apply = async () => {
		if (!file || !dims || !decoded.current || running) {
			if (!file) {
				notify.warning(tc("needFiles"));
			}
			return;
		}
		const target =
			mode === "pixels"
				? {
						width: Number.parseInt(width, 10),
						height: Number.parseInt(height, 10),
					}
				: {
						width: Math.max(1, Math.round((dims.width * percent) / 100)),
						height: Math.max(1, Math.round((dims.height * percent) / 100)),
					};
		if (
			!Number.isFinite(target.width) ||
			!Number.isFinite(target.height) ||
			target.width < 1 ||
			target.height < 1
		) {
			setError(te("generic"));
			return;
		}
		if (target.width * target.height > MAX_IMAGE_PIXELS) {
			setError(te("tooLarge", { limit: "64 MP" }));
			return;
		}
		setRunning(true);
		setError(null);
		try {
			const worker = await imageWorker();
			const resized = await worker.resizeImage(
				decoded.current.image,
				target.width,
				target.height,
			);
			const encoded = await worker.encodeImage(
				resized,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			const filename = `${stemOf(file.name)}-${target.width}x${target.height}.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({
				bytes: encoded.bytes,
				mime: encoded.mime,
				extension: encoded.extension,
				filename,
				width: target.width,
				height: target.height,
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
				{dims ? (
					<p
						className="font-display text-small tabular-nums text-text-2"
						data-testid="resize-dims"
					>
						{dims.width} × {dims.height}
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
				<TabsRoot
					defaultValue="pixels"
					onValueChange={(value) => setMode(value)}
				>
					<TabsList>
						<TabsTab className={tabActiveClass} value="pixels">
							{t("options.unitPixels")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="percent">
							{t("options.unitPercent")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>
				{mode === "pixels" ? (
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor="resize-width">
								{t("options.width")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="resize-width"
								inputMode="numeric"
								onChange={(event) => onWidth(event.target.value)}
								type="number"
								value={width}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="resize-height">
								{t("options.height")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="resize-height"
								inputMode="numeric"
								onChange={(event) => onHeight(event.target.value)}
								type="number"
								value={height}
							/>
						</Field>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<span
								className="text-small font-medium"
								id="resize-percent-label"
							>
								{t("options.unitPercent")}
							</span>
							<output
								aria-labelledby="resize-percent-label"
								className="font-display text-h3 tabular-nums"
							>
								{percent}%
							</output>
						</div>
						<Slider
							aria-label={t("options.unitPercent")}
							max={500}
							min={1}
							onValueChange={setPercent}
							value={percent}
						/>
					</div>
				)}
				{/* biome-ignore lint/a11y/noLabelWithoutControl: wrapping label, the switch renders a labelable button */}
				<label className="flex cursor-pointer items-center gap-3 text-small text-text">
					<Switch checked={keepRatio} onCheckedChange={setKeepRatio} />
					{t("options.keepRatio")}
				</label>
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
