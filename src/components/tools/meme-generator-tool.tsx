"use client";

import {
	ArrowDown,
	ArrowUp,
	ImagePlus,
	Plus,
	Trash2,
	Upload,
} from "lucide-react";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import ColorPickerField from "@/components/tool/color-picker-field";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBlob } from "@/lib/images/download";
import { stemOf } from "@/lib/images/formats";
import { cn } from "@/lib/utils";

const TEMPLATES = [
	"spongebob-four-panels",
	"spongebob-blank-board",
	"book-crying-panels",
	"spongebob-blank-sign",
	"my-dream-reality",
	"drake-blank",
	"spongebob-eyes",
	"star-rating",
	"distracted-boyfriend",
	"presentation-arms",
	"drake-hotline",
	"family-guy-panels",
	"pink-white-panels",
	"waiting-room",
	"fry-suspicious",
	"hallway-run",
	"expanding-brain",
	"choose-one-pills",
	"cat-red-room",
] as const;

const FONTS = [
	{ value: "impact", label: "Impact" },
	{ value: "display", label: "CalSans" },
	{ value: "sans", label: "Arial" },
] as const;

const FONT_STACK: Record<string, string> = {
	impact: "Impact, 'Arial Black', sans-serif",
	display: "CalSans, Impact, sans-serif",
	sans: "Arial, Helvetica, sans-serif",
};

interface TextLayer {
	id: string;
	type: "text";
	x: number;
	y: number;
	text: string;
	fontSize: number;
	color: string;
	stroke: boolean;
	strokeWidth: number;
	outlineColor: string;
	font: (typeof FONTS)[number]["value"];
}

interface ImageLayer {
	id: string;
	type: "image";
	x: number;
	y: number;
	width: number;
	dataUrl: string;
	name: string;
}

type Layer = TextLayer | ImageLayer;

function uid(): string {
	return (
		globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now().toString(36)}`
	);
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new window.Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("image"));
		image.src = src;
	});
}

export default function MemeGeneratorTool() {
	const t = useTranslations("tools.meme-generator");
	const [template, setTemplate] = useState<string>(`/meme/${TEMPLATES[0]}.jpg`);
	const [backgroundName, setBackgroundName] = useState(`${TEMPLATES[0]}.jpg`);
	const [aspect, setAspect] = useState(1);
	const [layers, setLayers] = useState<Layer[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState<string | null>(null);
	const stage = useRef<HTMLDivElement>(null);
	const resize = useRef<{
		id: string;
		type: Layer["type"];
		centerX: number;
		centerY: number;
		distance: number;
		fontSize: number;
		width: number;
	} | null>(null);
	const background = useRef<HTMLImageElement>(null);
	const imageInput = useRef<HTMLInputElement>(null);
	const layerImageInput = useRef<HTMLInputElement>(null);

	const active = layers.find((layer) => layer.id === selected) ?? null;

	useEffect(() => {
		if (!template) {
			return;
		}
		let live = true;
		loadImage(template)
			.then((image) => {
				if (live && image.naturalWidth > 0) {
					setAspect(image.naturalWidth / image.naturalHeight);
				}
			})
			.catch(() => setError(t("options.imageError")));
		return () => {
			live = false;
		};
	}, [template, t]);

	const addText = () => {
		const layer: TextLayer = {
			id: uid(),
			type: "text",
			x: 0.5,
			y: 0.5,
			text: t("options.defaultText"),
			fontSize: 8,
			color: "#ffffff",
			stroke: true,
			strokeWidth: 4,
			outlineColor: "#000000",
			font: "impact",
		};
		setLayers((current) => [...current, layer]);
		setSelected(layer.id);
	};

	const addImage = async (file: File) => {
		try {
			const dataUrl = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result));
				reader.onerror = () => reject(new Error("read"));
				reader.readAsDataURL(file);
			});
			const image = await loadImage(dataUrl);
			const layer: ImageLayer = {
				id: uid(),
				type: "image",
				x: 0.5,
				y: 0.5,
				width: 0.3,
				dataUrl,
				name: file.name,
			};
			if (image.naturalWidth === 0) {
				throw new Error("image");
			}
			setLayers((current) => [...current, layer]);
			setSelected(layer.id);
		} catch {
			setError(t("options.imageError"));
		}
	};

	const moveLayer = (id: string, direction: -1 | 1) => {
		setLayers((current) => {
			const index = current.findIndex((layer) => layer.id === id);
			const next = index + direction;
			if (index < 0 || next < 0 || next >= current.length) {
				return current;
			}
			const copy = [...current];
			const [item] = copy.splice(index, 1);
			if (item) {
				copy.splice(next, 0, item);
			}
			return copy;
		});
	};

	const updateLayer = (
		id: string,
		patch: Partial<TextLayer> | Partial<ImageLayer>,
	) => {
		setLayers((current) =>
			current.map((layer) =>
				layer.id === id ? ({ ...layer, ...patch } as Layer) : layer,
			),
		);
	};

	const drag = (event: React.PointerEvent, id: string) => {
		const rect = stage.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}
		const x = Math.min(
			1,
			Math.max(0, (event.clientX - rect.left) / rect.width),
		);
		const y = Math.min(
			1,
			Math.max(0, (event.clientY - rect.top) / rect.height),
		);
		updateLayer(id, { x, y } as Partial<Layer>);
	};

	// the corner handle is the only way a layer changes size, a plain drag
	// on a touch screen never should.
	const startResize = (event: React.PointerEvent, layer: Layer) => {
		const rect = stage.current?.getBoundingClientRect();
		if (!rect) {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		event.currentTarget.setPointerCapture(event.pointerId);
		const centerX = rect.left + layer.x * rect.width;
		const centerY = rect.top + layer.y * rect.height;
		resize.current = {
			id: layer.id,
			type: layer.type,
			centerX,
			centerY,
			distance:
				Math.hypot(event.clientX - centerX, event.clientY - centerY) || 1,
			fontSize: layer.type === "text" ? layer.fontSize : 0,
			width: layer.type === "image" ? layer.width : 0,
		};
		setSelected(layer.id);
	};

	const resizeMove = (event: React.PointerEvent) => {
		const current = resize.current;
		if (!current) {
			return;
		}
		event.preventDefault();
		const distance =
			Math.hypot(
				event.clientX - current.centerX,
				event.clientY - current.centerY,
			) || 1;
		const ratio = Math.max(0.15, distance / current.distance);
		if (current.type === "text") {
			const fontSize = Math.min(26, Math.max(2, current.fontSize * ratio));
			updateLayer(current.id, {
				fontSize: Math.round(fontSize * 10) / 10,
			} as Partial<TextLayer>);
		} else {
			const width = Math.min(0.95, Math.max(0.03, current.width * ratio));
			updateLayer(current.id, {
				width: Math.round(width * 1000) / 1000,
			} as Partial<ImageLayer>);
		}
	};

	const download = async () => {
		if (!background.current || running) {
			notify.warning(t("options.needBackground"));
			return;
		}
		setRunning(true);
		setError(null);
		try {
			await document.fonts.ready;
			const base = background.current;
			const canvas = document.createElement("canvas");
			canvas.width = base.naturalWidth;
			canvas.height = base.naturalHeight;
			const context = canvas.getContext("2d");
			if (!context) {
				throw new Error("canvas");
			}
			context.drawImage(base, 0, 0, canvas.width, canvas.height);
			const images = new Map<string, HTMLImageElement>();
			for (const layer of layers) {
				if (layer.type !== "image" || images.has(layer.dataUrl)) {
					continue;
				}
				images.set(layer.dataUrl, await loadImage(layer.dataUrl));
			}
			for (const layer of layers) {
				if (layer.type === "image") {
					const image = images.get(layer.dataUrl);
					if (!image) {
						continue;
					}
					const width = canvas.width * layer.width;
					const height = width * (image.naturalHeight / image.naturalWidth);
					context.drawImage(
						image,
						layer.x * canvas.width - width / 2,
						layer.y * canvas.height - height / 2,
						width,
						height,
					);
					continue;
				}
				const fontPx = (layer.fontSize / 100) * canvas.width;
				const weight = layer.font === "impact" ? 900 : 700;
				context.font = `${weight} ${fontPx}px ${FONT_STACK[layer.font]}`;
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.lineJoin = "round";
				const lines = layer.text.split("\n");
				const lineHeight = fontPx * 1.08;
				const startY =
					layer.y * canvas.height - ((lines.length - 1) * lineHeight) / 2;
				lines.forEach((line, index) => {
					const x = layer.x * canvas.width;
					const y = startY + index * lineHeight;
					if (layer.stroke) {
						context.lineWidth = fontPx * (layer.strokeWidth / 100);
						context.strokeStyle = layer.outlineColor;
						context.strokeText(line, x, y);
					}
					context.fillStyle = layer.color;
					context.fillText(line, x, y);
				});
			}
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, "image/png"),
			);
			if (!blob) {
				throw new Error("blob");
			}
			downloadBlob(blob, `${stemOf(backgroundName)}-meme.png`);
		} catch {
			setError(t("options.imageError"));
		} finally {
			setRunning(false);
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
			<div className="flex min-w-0 flex-col gap-4">
				<div
					className="relative w-full touch-none overflow-hidden rounded-lg border border-border bg-surface-2"
					data-testid="meme-preview"
					ref={stage}
					style={{ aspectRatio: aspect, containerType: "inline-size" }}
				>
					{/* biome-ignore lint/performance/noImgElement: the canvas export reads this element */}
					<img
						alt=""
						className="pointer-events-none absolute inset-0 size-full select-none object-contain"
						draggable={false}
						onLoad={(event) => {
							const image = event.currentTarget;
							if (image.naturalWidth > 0) {
								setAspect(image.naturalWidth / image.naturalHeight);
							}
						}}
						ref={background}
						src={template}
					/>
					{layers.map((layer) => (
						// biome-ignore lint/a11y/useSemanticElements: holds a resize button, buttons cannot nest
						<div
							aria-label={layer.type === "text" ? layer.text : layer.name}
							className={cn(
								"absolute -translate-x-1/2 -translate-y-1/2 cursor-move touch-none select-none border border-transparent outline-none focus-visible:border-blue-500",
								selected === layer.id && "border-blue-400",
							)}
							key={layer.id}
							onKeyDown={(event) => {
								if (event.key === "Enter" || event.key === " ") {
									event.preventDefault();
									setSelected(layer.id);
								}
							}}
							onPointerCancel={() => setDragging(null)}
							onPointerDown={(event) => {
								event.preventDefault();
								event.currentTarget.setPointerCapture(event.pointerId);
								setSelected(layer.id);
								setDragging(layer.id);
							}}
							onPointerMove={(event) => {
								if (dragging === layer.id && !resize.current) {
									drag(event, layer.id);
								}
							}}
							onPointerUp={() => setDragging(null)}
							role="button"
							style={{
								left: `${layer.x * 100}%`,
								top: `${layer.y * 100}%`,
								...(layer.type === "text"
									? {
											maxWidth: "92%",
											padding: 4,
											textAlign: "center" as const,
											fontSize: `${layer.fontSize}cqw`,
											fontWeight: layer.font === "impact" ? 900 : 700,
											lineHeight: 1,
											color: layer.color,
											fontFamily: FONT_STACK[layer.font],
											WebkitTextStroke: layer.stroke
												? `${layer.strokeWidth / 100}em ${layer.outlineColor}`
												: undefined,
											paintOrder: "stroke fill",
										}
									: { width: `${layer.width * 100}%`, padding: 4 }),
							}}
							tabIndex={0}
						>
							{layer.type === "text" ? (
								<span className="pointer-events-none block whitespace-pre-wrap break-words">
									{layer.text}
								</span>
							) : (
								// biome-ignore lint/performance/noImgElement: layer data url, next-image cannot optimize it
								<img
									alt={layer.name}
									className="pointer-events-none h-auto w-full select-none"
									draggable={false}
									src={layer.dataUrl}
								/>
							)}
							{selected === layer.id ? (
								<button
									aria-label={t("options.resize")}
									className="absolute -right-3 -bottom-3 size-6 cursor-nwse-resize touch-none rounded-full border-2 border-white bg-blue-500 shadow-[0_1px_3px_rgb(0_0_0/0.4)] outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:size-5"
									onLostPointerCapture={() => {
										resize.current = null;
									}}
									onPointerCancel={() => {
										resize.current = null;
									}}
									onPointerDown={(event) => startResize(event, layer)}
									onPointerMove={resizeMove}
									onPointerUp={() => {
										resize.current = null;
									}}
									type="button"
								/>
							) : null}
						</div>
					))}
				</div>
				<p className="text-small text-text-2">{t("options.dragHint")}</p>

				<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
					<div className="flex items-center justify-between gap-2">
						<h2 className="font-display text-h3">{t("options.templates")}</h2>
						<input
							accept=".png,.jpg,.jpeg,.webp,.avif"
							aria-label={t("options.ownImage")}
							className="sr-only"
							onChange={(event) => {
								const picked = event.target.files?.[0];
								if (picked) {
									const url = URL.createObjectURL(picked);
									setTemplate(url);
									setBackgroundName(picked.name);
								}
								event.target.value = "";
							}}
							ref={imageInput}
							type="file"
						/>
						<SmoothButton
							onClick={() => imageInput.current?.click()}
							size="sm"
							variant="secondary"
						>
							<Upload aria-hidden="true" className="size-4" />
							{t("options.ownImage")}
						</SmoothButton>
					</div>
					<div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
						{TEMPLATES.map((entry, index) => (
							<button
								aria-label={t("options.templateN", { n: index + 1 })}
								aria-pressed={template === `/meme/${entry}.jpg`}
								className={cn(
									"aspect-square overflow-hidden rounded-md border bg-surface-2 outline-none transition-colors focus-visible:border-blue-500",
									template === `/meme/${entry}.jpg`
										? "border-blue-500 shadow-glow"
										: "border-border hover:border-blue-400",
								)}
								key={entry}
								onClick={() => {
									setTemplate(`/meme/${entry}.jpg`);
									setBackgroundName(`${entry}.jpg`);
								}}
								type="button"
							>
								<NextImage
									alt=""
									className="size-full object-cover"
									height={160}
									src={`/meme/${entry}.jpg`}
									width={160}
								/>
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<div className="flex gap-2">
					<SmoothButton className="w-full" onClick={addText} size="sm">
						<Plus aria-hidden="true" className="size-4" />
						{t("options.addText")}
					</SmoothButton>
					<input
						accept=".png,.jpg,.jpeg,.webp,.avif"
						aria-label={t("options.addImage")}
						className="sr-only"
						onChange={(event) => {
							const picked = event.target.files?.[0];
							if (picked) {
								addImage(picked);
							}
							event.target.value = "";
						}}
						ref={layerImageInput}
						type="file"
					/>
					<SmoothButton
						className="w-full"
						onClick={() => layerImageInput.current?.click()}
						size="sm"
						variant="secondary"
					>
						<ImagePlus aria-hidden="true" className="size-4" />
						{t("options.addImage")}
					</SmoothButton>
				</div>

				{layers.length === 0 ? (
					<p className="text-small text-text-3">{t("options.emptyLayers")}</p>
				) : (
					<div className="flex flex-col gap-1">
						{layers.map((layer) => (
							<div className="flex items-center gap-1" key={layer.id}>
								<button
									className={cn(
										"min-h-9 min-w-0 flex-1 truncate rounded-md border px-2 text-start text-small outline-none",
										selected === layer.id
											? "border-blue-500 bg-surface-2 text-text"
											: "border-border text-text-2 hover:text-text",
									)}
									onClick={() => setSelected(layer.id)}
									type="button"
								>
									{layer.type === "text"
										? layer.text || t("options.textLayer")
										: layer.name}
								</button>
								<button
									aria-label={t("options.moveUp")}
									className="inline-flex size-9 items-center justify-center text-text-3 outline-none hover:text-text focus-visible:text-blue-500"
									onClick={() => moveLayer(layer.id, 1)}
									type="button"
								>
									<ArrowUp aria-hidden="true" className="size-4" />
								</button>
								<button
									aria-label={t("options.moveDown")}
									className="inline-flex size-9 items-center justify-center text-text-3 outline-none hover:text-text focus-visible:text-blue-500"
									onClick={() => moveLayer(layer.id, -1)}
									type="button"
								>
									<ArrowDown aria-hidden="true" className="size-4" />
								</button>
								<button
									aria-label={t("options.removeLayer")}
									className="inline-flex size-9 items-center justify-center text-text-3 outline-none hover:text-error focus-visible:text-error"
									onClick={() => {
										setLayers((current) =>
											current.filter((item) => item.id !== layer.id),
										);
										if (selected === layer.id) {
											setSelected(null);
										}
									}}
									type="button"
								>
									<Trash2 aria-hidden="true" className="size-4" />
								</button>
							</div>
						))}
					</div>
				)}

				{active?.type === "text" ? (
					<>
						<Field>
							<FieldLabel htmlFor="meme-layer-text">
								{t("options.text")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="meme-layer-text"
								onChange={(event) =>
									updateLayer(active.id, { text: event.target.value })
								}
								value={active.text}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="meme-layer-font">
								{t("options.font")}
							</FieldLabel>
							<Select
								aria-label={t("options.font")}
								className={selectTriggerClass}
								onValueChange={(value) =>
									updateLayer(active.id, {
										font: value as TextLayer["font"],
									})
								}
								options={FONTS.map((font) => ({
									label: font.label,
									value: font.value,
								}))}
								value={active.font}
							/>
						</Field>
						<div className="flex flex-col gap-2">
							<div className="flex items-center justify-between gap-2">
								<span className="text-small font-medium">
									{t("options.fontSize")}
								</span>
								<output className="font-display text-h3 tabular-nums">
									{active.fontSize}
								</output>
							</div>
							<Slider
								aria-label={t("options.fontSize")}
								max={22}
								min={3}
								onValueChange={(value) =>
									updateLayer(active.id, { fontSize: value })
								}
								value={active.fontSize}
							/>
						</div>
						<div className="flex items-center justify-between gap-3">
							<span className="text-small font-medium">
								{t("options.color")}
							</span>
							<ColorPickerField
								label={t("options.color")}
								onChange={(value) => updateLayer(active.id, { color: value })}
								value={active.color}
								variant="swatch"
							/>
						</div>
						<div className="flex items-center justify-between gap-3">
							<span className="text-small font-medium">
								{t("options.stroke")}
							</span>
							<Switch
								aria-label={t("options.stroke")}
								checked={active.stroke}
								onCheckedChange={(checked) =>
									updateLayer(active.id, { stroke: checked })
								}
							/>
						</div>
						{active.stroke ? (
							<>
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between gap-2">
										<span className="text-small font-medium">
											{t("options.outlineSize")}
										</span>
										<output className="font-display text-h3 tabular-nums">
											{active.strokeWidth}
										</output>
									</div>
									<Slider
										aria-label={t("options.outlineSize")}
										max={12}
										min={1}
										onValueChange={(value) =>
											updateLayer(active.id, { strokeWidth: value })
										}
										value={active.strokeWidth}
									/>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-small font-medium">
										{t("options.outlineColor")}
									</span>
									<ColorPickerField
										label={t("options.outlineColor")}
										onChange={(value) =>
											updateLayer(active.id, { outlineColor: value })
										}
										value={active.outlineColor}
										variant="swatch"
									/>
								</div>
							</>
						) : null}
					</>
				) : null}

				{active?.type === "image" ? (
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between gap-2">
							<span className="text-small font-medium">
								{t("options.imageWidth")}
							</span>
							<output className="font-display text-h3 tabular-nums">
								{Math.round(active.width * 100)}%
							</output>
						</div>
						<Slider
							aria-label={t("options.imageWidth")}
							max={90}
							min={5}
							onValueChange={(value) =>
								updateLayer(active.id, { width: value / 100 })
							}
							value={Math.round(active.width * 100)}
						/>
					</div>
				) : null}

				<SmoothButton
					className="w-full"
					disabled={running}
					loading={running}
					onClick={download}
					size="lg"
				>
					{t("options.download")}
				</SmoothButton>
				{error ? (
					<p className="text-small text-error" role="alert">
						{error}
					</p>
				) : null}
			</div>
		</div>
	);
}
