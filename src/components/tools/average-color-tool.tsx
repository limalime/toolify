"use client";

import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import {
	averageColor,
	cssHsl,
	cssRgb,
	type AverageColor,
	type DominantColor,
	dominantColors,
	rgbToHsl,
} from "@/lib/images/color";
import {
	MAX_IMAGE_BYTES,
	RASTER_ACCEPT,
} from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";

export default function AverageColorTool() {
	const t = useTranslations("tools.average-color");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [sourceUrl, setSourceUrl] = useState<string | null>(null);
	const [result, setResult] = useState<AverageColor | null>(null);
	const [palette, setPalette] = useState<DominantColor[]>([]);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const url = useRef<string | null>(null);

	const reset = () => {
		if (url.current) {
			URL.revokeObjectURL(url.current);
			url.current = null;
		}
		setFile(null);
		setSourceUrl(null);
		setResult(null);
		setPalette([]);
		setError(null);
	};

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
		setRunning(true);
		try {
			const worker = await imageWorker();
			const decoded = await worker.decodeInput(
				await picked.arrayBuffer(),
				picked.name,
			);
			const width = Math.min(96, decoded.width);
			const height = Math.max(1, Math.round(width * (decoded.height / decoded.width)));
			const small = await worker.resizeImage(decoded.image, width, height);
			setResult(averageColor(small.data));
			setPalette(dominantColors(small.data, 6));
		} catch {
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
		}
	};

	const copy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			notify.success(t("options.copied"));
		} catch {
			notify.error(t("options.copy"));
		}
	};

	const hsl = result ? rgbToHsl(result) : null;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col gap-4">
				<Dropzone
					accept={RASTER_ACCEPT}
					browseLabel={tc("browse")}
					disabled={running}
					hint={tc("dropHint")}
					onFiles={addFiles}
				/>
				{file && sourceUrl ? (
					<div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
						{/* biome-ignore lint/performance/noImgElement: local blob preview */}
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
					<div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
						<div
							className="flex h-48 items-end rounded-lg p-4"
							style={{ backgroundColor: result.hex }}
						>
							<span
								className="text-h2 font-display"
								style={{
									color:
										result.r * 0.2126 + result.g * 0.7152 + result.b * 0.0722 >
										148
											? "#0a0e14"
											: "#ffffff",
								}}
							>
								{result.hex}
							</span>
						</div>
						<dl className="grid gap-2 text-small" data-testid="average-result">
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">HEX</dt>
								<dd className="font-mono text-text">{result.hex}</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">RGB</dt>
								<dd className="font-mono text-text">
									{cssRgb(result)}
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-text-3">HSL</dt>
								<dd className="font-mono text-text">
									{hsl ? cssHsl(hsl) : ""}
								</dd>
							</div>
						</dl>
						{result.transparent > 0 ? (
							<p className="text-caption text-text-3">
								{t("options.transparent", { count: result.transparent })}
							</p>
						) : null}
						{palette.length > 0 ? (
							<div className="flex flex-col gap-2">
								<span className="text-small font-medium">
									{t("options.palette")}
								</span>
								<div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
									{palette.map((entry) => (
										<button
											aria-label={entry.hex}
											className="flex cursor-pointer flex-col gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
											key={entry.hex}
											onClick={() => copy(entry.hex)}
											type="button"
										>
											<span
												className="h-12 rounded-md border border-border"
												style={{ backgroundColor: entry.hex }}
											/>
											<span className="font-mono text-caption text-text-2">
												{entry.hex}
											</span>
										</button>
									))}
								</div>
							</div>
						) : null}
					</div>
				) : null}
			</div>
			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<p className="text-small text-text-2">{t("options.hint")}</p>
				<SmoothButton
					disabled={!result}
					onClick={() => result && copy(result.hex)}
					size="lg"
				>
					<Copy aria-hidden="true" className="size-4" />
					{t("options.copy")}
				</SmoothButton>
				<p className="text-caption text-text-3">{tc("filesNeverLeave")}</p>
			</div>
		</div>
	);
}