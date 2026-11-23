"use client";

import { Copy, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import Dropzone from "@/components/primitives/dropzone";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import {
	cssHsl,
	cssRgb,
	pickColor,
	rgbToHsl,
	readableInk,
} from "@/lib/images/color";
import { MAX_IMAGE_BYTES, RASTER_ACCEPT } from "@/lib/images/formats";
import { imageWorker } from "@/lib/images/worker-client";

interface Picked {
	id: string;
	hex: string;
	r: number;
	g: number;
	b: number;
	x: number;
	y: number;
}

export default function ImageColorPickerTool() {
	const t = useTranslations("tools.image-color-picker");
	const tc = useTranslations("common");
	const te = useTranslations("errors");
	const [file, setFile] = useState<File | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [picks, setPicks] = useState<Picked[]>([]);
	const [current, setCurrent] = useState<Picked | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const pixels = useRef<{ data: Uint8ClampedArray; width: number; height: number } | null>(null);
	const url = useRef<string | null>(null);

	const reset = () => {
		if (url.current) {
			URL.revokeObjectURL(url.current);
			url.current = null;
		}
		pixels.current = null;
		setFile(null);
		setError(null);
		setPicks([]);
		setCurrent(null);
	};

	const addFiles = async (files: File[]) => {
		const [picked] = files;
		if (!picked) {
			return;
		}
		reset();
		setFile(picked);
		url.current = URL.createObjectURL(picked);
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
			const width = Math.min(1800, decoded.width);
			const height = Math.max(1, Math.round(width * (decoded.height / decoded.width)));
			const preview = await worker.resizeImage(decoded.image, width, height);
			pixels.current = preview;
			const target = canvas.current;
			if (target) {
				target.width = preview.width;
				target.height = preview.height;
				target.getContext("2d")?.putImageData(preview, 0, 0);
			}
		} catch {
			setError(te("unreadableFile"));
		} finally {
			setRunning(false);
		}
	};

	const sample = (event: React.PointerEvent<HTMLCanvasElement>) => {
		const source = pixels.current;
		const target = canvas.current;
		if (!source || !target) {
			return;
		}
		const rect = target.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * source.width;
		const y = ((event.clientY - rect.top) / rect.height) * source.height;
		const color = pickColor(source.data, source.width, source.height, x, y);
		const next: Picked = {
			id: `${Date.now().toString(36)}-${Math.round(x)}-${Math.round(y)}`,
			hex: color.hex,
			r: color.r,
			g: color.g,
			b: color.b,
			x: Math.round(x),
			y: Math.round(y),
		};
		setCurrent(next);
		setPicks((history) => [next, ...history.filter((item) => item.hex !== next.hex)].slice(0, 10));
	};

	const copy = async (value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			notify.success(t("options.copied"));
		} catch {
			notify.error(t("options.copy"));
		}
	};

	const hsl = current ? rgbToHsl(current) : null;

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
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
				{file ? (
					<div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
						<p className="truncate text-small text-text-2">{file.name}</p>
						<canvas
							aria-label={t("options.canvas")}
							className="h-auto w-full cursor-crosshair touch-none rounded-md"
							data-testid="picker-canvas"
							onPointerDown={(event) => {
								event.currentTarget.setPointerCapture(event.pointerId);
								sample(event);
							}}
							onPointerMove={(event) => {
								if (event.buttons === 1) {
									sample(event);
								}
							}}
							ref={canvas}
							role="img"
						/>
						<p className="text-caption text-text-3">{t("options.pickHint")}</p>
					</div>
				) : null}
				{picks.length > 0 ? (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<h2 className="font-display text-h3">{t("options.history")}</h2>
							<SmoothButton
								onClick={() => setPicks([])}
								size="sm"
								variant="ghost"
							>
								<Trash2 aria-hidden="true" className="size-4" />
								{t("options.clear")}
							</SmoothButton>
						</div>
						<div className="flex flex-wrap gap-2">
							{picks.map((entry) => (
								<button
									aria-label={entry.hex}
									className="size-10 cursor-pointer rounded-md border border-border"
									key={entry.id}
									onClick={() => setCurrent(entry)}
									style={{ backgroundColor: entry.hex }}
									type="button"
								/>
							))}
						</div>
					</div>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div
					className="flex h-28 items-center justify-center rounded-lg border border-border"
					style={{
						backgroundColor: current?.hex ?? "#1b56fd",
						color: current ? readableInk(current) : "#ffffff",
					}}
				>
					<span className="font-display text-h2" data-testid="picker-current">
						{current?.hex ?? "#1b56fd"}
					</span>
				</div>
				<dl className="grid gap-2 text-small">
					<div className="flex justify-between gap-3">
						<dt className="text-text-3">RGB</dt>
						<dd className="font-mono text-text">
							{current ? cssRgb(current) : "-"}
						</dd>
					</div>
					<div className="flex justify-between gap-3">
						<dt className="text-text-3">HSL</dt>
						<dd className="font-mono text-text">
							{hsl ? cssHsl(hsl) : "-"}
						</dd>
					</div>
					<div className="flex justify-between gap-3">
						<dt className="text-text-3">{t("options.position")}</dt>
						<dd className="font-mono text-text">
							{current ? `${current.x}, ${current.y}` : "-"}
						</dd>
					</div>
				</dl>
				<SmoothButton
					disabled={!current}
					onClick={() => current && copy(current.hex)}
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