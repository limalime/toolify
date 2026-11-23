"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import SmoothButton from "@/components/smoothui/smooth-button";
import ColorPickerField from "@/components/tool/color-picker-field";
import {
	decodeWheel,
	encodeWheel,
	MAX_WHEEL_COLORS,
	MAX_WHEEL_LABELS,
	normalizeRotation,
	pickIndex,
	rotationFor,
	segmentAt,
	shuffled,
	WHEEL_COLORS,
	wheelSegments,
} from "@/lib/random/wheel";
import { copyText } from "@/lib/text/clipboard";

const SIZE = 360;
const MAX_CENTER_BYTES = 2 * 1024 * 1024;

// dark ink on light slices, white on the rest.
function inkFor(hex: string): string {
	const value = Number.parseInt(hex.slice(1), 16);
	const red = (value >> 16) & 255;
	const green = (value >> 8) & 255;
	const blue = value & 255;
	return (0.299 * red + 0.587 * green + 0.114 * blue) / 255 > 0.62
		? "#0a0e14"
		: "#ffffff";
}

function draw(
	canvas: HTMLCanvasElement,
	labels: string[],
	rotation: number,
	colors: string[],
	centerImage: HTMLImageElement | null,
): void {
	const context = canvas.getContext("2d");
	if (!context) {
		return;
	}
	const ratio = window.devicePixelRatio || 1;
	canvas.width = SIZE * ratio;
	canvas.height = SIZE * ratio;
	context.setTransform(ratio, 0, 0, ratio, 0, 0);
	context.clearRect(0, 0, SIZE, SIZE);
	const center = SIZE / 2;
	const radius = center - 8;
	const segments = wheelSegments(labels);
	context.save();
	context.translate(center, center);
	context.rotate(rotation);
	for (const [index, segment] of segments.entries()) {
		const fill =
			colors[index % colors.length] ??
			WHEEL_COLORS[index % WHEEL_COLORS.length] ??
			"#1b56fd";
		context.beginPath();
		context.moveTo(0, 0);
		context.arc(
			0,
			0,
			radius,
			segment.start - Math.PI / 2,
			segment.end - Math.PI / 2,
		);
		context.closePath();
		context.fillStyle = fill;
		context.fill();
		context.strokeStyle = "rgba(255,255,255,0.5)";
		context.lineWidth = 2;
		context.stroke();
		context.save();
		context.rotate(segment.mid - Math.PI / 2);
		context.fillStyle = inkFor(fill);
		context.font = "600 14px system-ui, sans-serif";
		context.textAlign = "right";
		context.textBaseline = "middle";
		context.fillText(
			segment.label.length > 18
				? `${segment.label.slice(0, 17)}…`
				: segment.label,
			radius - 14,
			0,
		);
		context.restore();
	}
	if (centerImage && centerImage.complete && centerImage.naturalWidth > 0) {
		const side = Math.min(centerImage.naturalWidth, centerImage.naturalHeight);
		const sourceX = (centerImage.naturalWidth - side) / 2;
		const sourceY = (centerImage.naturalHeight - side) / 2;
		context.save();
		context.beginPath();
		context.arc(0, 0, 32, 0, Math.PI * 2);
		context.clip();
		context.drawImage(
			centerImage,
			sourceX,
			sourceY,
			side,
			side,
			-32,
			-32,
			64,
			64,
		);
		context.restore();
		context.beginPath();
		context.arc(0, 0, 32, 0, Math.PI * 2);
		context.strokeStyle = "#ffffff";
		context.lineWidth = 3;
		context.stroke();
	} else {
		context.beginPath();
		context.arc(0, 0, 26, 0, Math.PI * 2);
		context.fillStyle = "#0a0e14";
		context.fill();
		context.strokeStyle = "#ffffff";
		context.lineWidth = 3;
		context.stroke();
	}
	context.restore();
	context.beginPath();
	context.moveTo(center - 12, 8);
	context.lineTo(center + 12, 8);
	context.lineTo(center, 30);
	context.closePath();
	context.fillStyle = "#ffb020";
	context.fill();
}

export default function SpinWheelTool() {
	const t = useTranslations("tools.spin-wheel");
	const [text, setText] = useState("Pizza\nSushi\nBurger\nSalad\nTacos\nPasta");
	const [colors, setColors] = useState<string[]>(
		WHEEL_COLORS.slice(0, MAX_WHEEL_COLORS),
	);
	const [center, setCenter] = useState<{ url: string; name: string } | null>(
		null,
	);
	const [rotation, setRotation] = useState(0);
	const [spinning, setSpinning] = useState(false);
	const [winner, setWinner] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const frame = useRef<number | null>(null);
	const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
	const imageInput = useRef<HTMLInputElement>(null);
	const centerImage = useRef<HTMLImageElement | null>(null);
	const rotationRef = useRef(0);

	rotationRef.current = rotation;

	const labels = text
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean)
		.slice(0, MAX_WHEEL_LABELS);

	// labels is derived from text, key off its value instead
	// biome-ignore lint/correctness/useExhaustiveDependencies: labels is rebuilt from text every render
	const paint = useCallback(
		(angle: number) => {
			if (canvas.current) {
				draw(canvas.current, labels, angle, colors, centerImage.current);
			}
		},
		[text, colors],
	);

	useEffect(() => {
		paint(rotationRef.current);
	}, [paint]);

	useEffect(() => {
		const token = new URLSearchParams(window.location.hash.slice(1)).get(
			"wheel",
		);
		if (!token) {
			return;
		}
		const config = decodeWheel(token);
		if (!config) {
			return;
		}
		setText(config.labels.join("\n"));
		setColors(config.colors);
		setShareUrl(window.location.href);
	}, []);

	useEffect(() => {
		if (!center) {
			centerImage.current = null;
			paint(rotationRef.current);
			return;
		}
		const image = new window.Image();
		image.onload = () => {
			centerImage.current = image;
			paint(rotationRef.current);
		};
		image.onerror = () => {
			centerImage.current = null;
			notify.error(t("options.imageError"));
			setCenter(null);
		};
		image.src = center.url;
		return () => {
			image.onload = null;
			image.onerror = null;
		};
	}, [center, paint, t]);

	useEffect(() => {
		return () => {
			if (center) {
				URL.revokeObjectURL(center.url);
			}
		};
	}, [center]);

	useEffect(() => {
		return () => {
			if (frame.current) {
				cancelAnimationFrame(frame.current);
			}
			if (settle.current) {
				clearTimeout(settle.current);
			}
		};
	}, []);

	const spin = () => {
		if (labels.length < 2) {
			setError(t("options.needTwo"));
			return;
		}
		setError(null);
		setWinner(null);
		setSpinning(true);
		const buffer = new Uint32Array(1);
		crypto.getRandomValues(buffer);
		const index = pickIndex(labels.length, (buffer[0] ?? 0) / 4294967296);
		const from = normalizeRotation(rotation);
		const to = rotationFor(index, labels.length, 6);
		const start = performance.now();
		const duration = 2600;
		const finish = () => {
			if (frame.current) {
				cancelAnimationFrame(frame.current);
				frame.current = null;
			}
			setRotation(to);
			setSpinning(false);
			setWinner(labels[index] ?? null);
		};
		if (settle.current) {
			clearTimeout(settle.current);
		}
		// the animation is cosmetic. a background tab can throttle frames,
		// so the timer still settles the result.
		settle.current = setTimeout(finish, duration + 200);

		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / duration);
			const eased = 1 - (1 - progress) ** 3;
			const angle = from + (to - from) * eased;
			setRotation(angle);
			paint(angle);
			if (progress < 1) {
				frame.current = requestAnimationFrame(tick);
			} else {
				if (settle.current) {
					clearTimeout(settle.current);
					settle.current = null;
				}
				frame.current = null;
				setSpinning(false);
				const landed = segmentAt(angle, labels.length);
				setWinner(labels[landed] ?? null);
				paint(angle);
			}
		};
		frame.current = requestAnimationFrame(tick);
	};

	const shuffle = () => {
		if (labels.length < 2) {
			setError(t("options.needTwo"));
			return;
		}
		setError(null);
		setWinner(null);
		setShareUrl(null);
		const buffer = new Uint32Array(labels.length);
		crypto.getRandomValues(buffer);
		let cursor = 0;
		const order = shuffled(labels, () => (buffer[cursor++] ?? 0) / 4294967296);
		setText(order.join("\n"));
	};

	const share = async () => {
		if (labels.length < 2) {
			setError(t("options.needTwo"));
			return;
		}
		setError(null);
		const token = encodeWheel({ labels, colors });
		const url = `${window.location.origin}${window.location.pathname}#wheel=${token}`;
		setShareUrl(url);
		if (await copyText(url)) {
			notify.success(t("options.shareCopied"));
		} else {
			notify.warning(t("options.shareManual"));
		}
	};

	const addCenter = (files: FileList | null) => {
		const [file] = Array.from(files ?? []);
		if (!file) {
			return;
		}
		if (!file.type.startsWith("image/")) {
			notify.error(t("options.imageType"));
			return;
		}
		if (file.size > MAX_CENTER_BYTES) {
			notify.warning(t("options.imageTooLarge"));
			return;
		}
		setCenter({ url: URL.createObjectURL(file), name: file.name });
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="flex min-w-0 flex-col items-center gap-4">
				<canvas
					aria-label={t("options.wheel")}
					className="h-auto w-full max-w-md"
					data-testid="spin-canvas"
					ref={canvas}
					role="img"
				/>
				<SmoothButton
					disabled={spinning}
					loading={spinning}
					onClick={spin}
					size="lg"
					variant="candy"
				>
					{t("options.spin")}
				</SmoothButton>
				<div
					aria-live="polite"
					className="flex min-h-16 w-full max-w-md items-center justify-center rounded-lg border border-border bg-surface p-4 text-center"
				>
					{winner ? (
						<p
							className="font-display text-h2 text-text"
							data-testid="spin-result"
						>
							{winner}
						</p>
					) : (
						<p className="text-small text-text-3">{t("options.ready")}</p>
					)}
				</div>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex flex-col gap-3">
					<label className="text-small font-medium" htmlFor="wheel-options">
						{t("options.options")}
					</label>
					<textarea
						className="min-h-56 w-full resize-y rounded-md border border-border bg-surface-2 p-3 text-small text-text outline-none focus-visible:border-blue-500"
						data-testid="spin-options"
						id="wheel-options"
						onChange={(event) => {
							setText(event.target.value);
							setWinner(null);
							setShareUrl(null);
						}}
						rows={10}
						value={text}
					/>
					<p className="text-caption text-text-3">
						{t("options.count", { count: labels.length })}
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-small font-medium">{t("options.colors")}</span>
					<div className="grid grid-cols-8 gap-1" data-testid="spin-colors">
						{colors.map((color, index) => (
							<ColorPickerField
								className="h-8 w-full"
								key={index}
								label={t("options.sliceColor", { number: index + 1 })}
								onChange={(next) => {
									setColors((current) =>
										current.map((entry, entryIndex) =>
											entryIndex === index ? next : entry,
										),
									);
									setShareUrl(null);
								}}
								value={color}
								variant="swatch"
							/>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<span className="text-small font-medium">
						{t("options.centerImage")}
					</span>
					<input
						accept="image/png,image/jpeg,image/webp,image/gif"
						aria-label={t("options.centerImage")}
						className="sr-only"
						data-testid="spin-image-input"
						onChange={(event) => {
							addCenter(event.target.files);
							event.target.value = "";
						}}
						ref={imageInput}
						type="file"
					/>
					<div className="flex flex-wrap items-center gap-2">
						<SmoothButton
							onClick={() => imageInput.current?.click()}
							size="sm"
							variant="secondary"
						>
							{t("options.uploadImage")}
						</SmoothButton>
						{center ? (
							<SmoothButton
								onClick={() => setCenter(null)}
								size="sm"
								variant="ghost"
							>
								{t("options.removeImage")}
							</SmoothButton>
						) : null}
					</div>
					<p className="truncate text-caption text-text-3">
						{center ? center.name : t("options.imageHint")}
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<SmoothButton
						data-testid="spin-shuffle"
						onClick={shuffle}
						size="sm"
						variant="secondary"
					>
						{t("options.shuffle")}
					</SmoothButton>
					<SmoothButton
						data-testid="spin-share"
						onClick={share}
						size="sm"
						variant="secondary"
					>
						{t("options.share")}
					</SmoothButton>
				</div>

				{shareUrl ? (
					<div className="flex flex-col gap-1">
						<label
							className="text-caption text-text-3"
							htmlFor="wheel-share-url"
						>
							{t("options.shareLink")}
						</label>
						<input
							className="w-full rounded-md border border-border bg-surface-2 px-2 py-1.5 font-mono text-caption text-text outline-none focus-visible:border-blue-500"
							data-testid="spin-share-url"
							id="wheel-share-url"
							onFocus={(event) => event.target.select()}
							readOnly
							value={shareUrl}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}
