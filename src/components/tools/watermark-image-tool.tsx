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
import {
	anchorPosition,
	markScale,
	rasterizeTextMark,
	WATERMARK_POSITIONS,
	type WatermarkPosition,
} from "@/lib/images/watermark";
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

interface Result {
	bytes: ArrayBuffer;
	mime: string;
	filename: string;
	width: number;
	height: number;
	url: string;
}

export default function WatermarkImageTool() {
	const t = useTranslations("tools.watermark-image");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [mode, setMode] = useState("text");
	const [text, setText] = useState("© Toolify");
	const [fontSize, setFontSize] = useState(48);
	const [markFile, setMarkFile] = useState<File | null>(null);
	const [position, setPosition] = useState<WatermarkPosition>(8);
	const [opacity, setOpacity] = useState(70);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const decoded = useRef<DecodedImage | null>(null);
	const format = useRef<Format>("png");
	const urls = useRef<string[]>([]);
	const markInput = useRef<HTMLInputElement>(null);

	const reset = () => {
		for (const url of urls.current) {
			URL.revokeObjectURL(url);
		}
		urls.current = [];
		decoded.current = null;
		setFile(null);
		setError(null);
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
		if (mode === "image" && !markFile) {
			notify.warning(t("options.imageLabel"));
			return;
		}
		setRunning(true);
		setError(null);
		try {
			const worker = await imageWorker();
			const base = decoded.current;
			let overlay: DecodedImage;
			if (mode === "text") {
				const raster = rasterizeTextMark(text.trim() || "©", fontSize);
				overlay = {
					image: raster.data,
					width: raster.width,
					height: raster.height,
				};
			} else if (markFile) {
				const mark = await worker.decodeInput(
					await markFile.arrayBuffer(),
					markFile.name,
				);
				const scaled = markScale(mark.width, mark.height, base.width);
				const resized = await worker.resizeImage(
					mark.image,
					scaled.width,
					scaled.height,
				);
				overlay = {
					image: resized,
					width: scaled.width,
					height: scaled.height,
				};
			} else {
				throw new Error("mark");
			}
			const point = anchorPosition(
				position,
				base.width,
				base.height,
				overlay.width,
				overlay.height,
			);
			const stamped = await worker.compositeImage(
				base.image,
				overlay.image,
				point.x,
				point.y,
				opacity / 100,
			);
			const encoded = await worker.encodeImage(
				stamped,
				format.current,
				OUTPUT_QUALITY[format.current],
				"#ffffff",
			);
			const filename = `${stemOf(file.name)}-watermarked.${encoded.extension}`;
			const url = URL.createObjectURL(
				new Blob([encoded.bytes], { type: encoded.mime }),
			);
			urls.current.push(url);
			setResult({
				bytes: encoded.bytes,
				mime: encoded.mime,
				filename,
				width: base.width,
				height: base.height,
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
				<TabsRoot defaultValue="text" onValueChange={(value) => setMode(value)}>
					<TabsList>
						<TabsTab className={tabActiveClass} value="text">
							{t("options.modeText")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="image">
							{t("options.modeImage")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>
				{mode === "text" ? (
					<>
						<Field>
							<FieldLabel htmlFor="watermark-text">
								{t("options.text")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="watermark-text"
								placeholder={t("options.textPlaceholder")}
								autoComplete="off"
								value={text}
								onChange={(event) => setText(event.target.value)}
							/>
						</Field>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<span
									className="text-small font-medium"
									id="watermark-size-label"
								>
									{t("options.fontSize")}
								</span>
								<output
									aria-labelledby="watermark-size-label"
									className="font-display text-h3 tabular-nums"
								>
									{fontSize}
								</output>
							</div>
							<Slider
								aria-label={t("options.fontSize")}
								max={200}
								min={12}
								onValueChange={setFontSize}
								value={fontSize}
							/>
						</div>
					</>
				) : (
					<div className="flex flex-col gap-2">
						<span className="text-small font-medium" id="watermark-image-label">
							{t("options.imageLabel")}
						</span>
						<input
							accept={RASTER_ACCEPT}
							aria-labelledby="watermark-image-label"
							className="sr-only"
							onChange={(event) => {
								const [picked] = Array.from(event.target.files ?? []);
								if (picked) {
									setMarkFile(picked);
								}
								event.target.value = "";
							}}
							ref={markInput}
							type="file"
						/>
						<SmoothButton
							onClick={() => markInput.current?.click()}
							size="sm"
							variant="secondary"
						>
							{t("options.browseImage")}
						</SmoothButton>
						{markFile ? (
							<p className="truncate text-small text-text-2">{markFile.name}</p>
						) : null}
					</div>
				)}
				<div className="flex flex-col gap-2">
					<fieldset className="grid w-fit grid-cols-3 gap-1">
						<legend className="text-small font-medium">
							{t("options.position")}
						</legend>
						{WATERMARK_POSITIONS.map((slot) => (
							<button
								key={slot}
								type="button"
								aria-label={String(slot + 1)}
								aria-pressed={position === slot}
								onClick={() => setPosition(slot)}
								className={cn(
									"size-11 cursor-pointer rounded-lg border outline-none transition-colors focus-visible:border-blue-500",
									position === slot
										? "border-blue-500 shadow-glow"
										: "border-border bg-surface-2 hover:border-blue-500",
								)}
							/>
						))}
					</fieldset>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<span
							className="text-small font-medium"
							id="watermark-opacity-label"
						>
							{t("options.opacity")}
						</span>
						<output
							aria-labelledby="watermark-opacity-label"
							className="font-display text-h3 tabular-nums"
						>
							{opacity}%
						</output>
					</div>
					<Slider
						aria-label={t("options.opacity")}
						max={100}
						min={0}
						onValueChange={setOpacity}
						value={opacity}
					/>
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
