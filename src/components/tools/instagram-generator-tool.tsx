"use client";

import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import {
	TabsIndicator,
	TabsList,
	TabsRoot,
	TabsTab,
} from "@/components/smoothui/tabs";
import { inputClass, tabActiveClass } from "@/lib/control-classes";
import { downloadBlob } from "@/lib/images/download";
import {
	canvasBlob,
	drawAvatar,
	drawCover,
	drawParagraph,
	formatCount,
	loadCanvasImage,
	MOCKUP_FONTS,
	roundRect,
	wrapLines,
} from "@/lib/images/mockup";

type Mode = "post" | "story" | "dm";

function heart(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	filled: boolean,
): void {
	context.save();
	context.translate(x, y);
	context.scale(size / 24, size / 24);
	context.beginPath();
	context.moveTo(12, 21);
	context.bezierCurveTo(4, 14, 1, 10, 1, 6.5);
	context.bezierCurveTo(1, 3, 3.5, 1, 6.5, 1);
	context.bezierCurveTo(9, 1, 11, 2.5, 12, 4.5);
	context.bezierCurveTo(13, 2.5, 15, 1, 17.5, 1);
	context.bezierCurveTo(20.5, 1, 23, 3, 23, 6.5);
	context.bezierCurveTo(23, 10, 20, 14, 12, 21);
	context.closePath();
	if (filled) {
		context.fillStyle = "#ed4956";
		context.fill();
	} else {
		context.strokeStyle = "#262626";
		context.lineWidth = 2;
		context.stroke();
	}
	context.restore();
}

export default function InstagramGeneratorTool() {
	const t = useTranslations("tools.instagram-generator");
	const [mode, setMode] = useState<Mode>("post");
	const [username, setUsername] = useState("toolify.bond");
	const [caption, setCaption] = useState(t("options.sampleCaption"));
	const [likes, setLikes] = useState("1284");
	const [dark, setDark] = useState(false);
	const [incoming, setIncoming] = useState(t("options.sampleIncoming"));
	const [outgoing, setOutgoing] = useState(t("options.sampleOutgoing"));
	const [imageName, setImageName] = useState<string | null>(null);
	const [avatarName, setAvatarName] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const image = useRef<HTMLImageElement | null>(null);
	const avatar = useRef<HTMLImageElement | null>(null);
	const urls = useRef<string[]>([]);
	const imageInput = useRef<HTMLInputElement>(null);
	const avatarInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		return () => {
			for (const url of urls.current) {
				URL.revokeObjectURL(url);
			}
		};
	}, []);

	useEffect(() => {
		const target = canvas.current;
		const context = target?.getContext("2d");
		if (!target || !context) {
			return;
		}
		if (mode === "story") {
			target.width = 1080;
			target.height = 1920;
			context.fillStyle = "#1a1a1a";
			context.fillRect(0, 0, 1080, 1920);
			if (image.current) {
				drawCover(context, image.current, 0, 0, 1080, 1920);
			} else {
				const gradient = context.createLinearGradient(0, 0, 1080, 1920);
				gradient.addColorStop(0, "#833ab4");
				gradient.addColorStop(0.5, "#fd1d1d");
				gradient.addColorStop(1, "#fcb045");
				context.fillStyle = gradient;
				context.fillRect(0, 0, 1080, 1920);
			}
			const top = context.createLinearGradient(0, 0, 0, 320);
			top.addColorStop(0, "rgba(0,0,0,0.55)");
			top.addColorStop(1, "rgba(0,0,0,0)");
			context.fillStyle = top;
			context.fillRect(0, 0, 1080, 320);
			const bottom = context.createLinearGradient(0, 1320, 0, 1920);
			bottom.addColorStop(0, "rgba(0,0,0,0)");
			bottom.addColorStop(1, "rgba(0,0,0,0.75)");
			context.fillStyle = bottom;
			context.fillRect(0, 1320, 1080, 600);

			let x = 24;
			for (let index = 0; index < 3; index += 1) {
				context.fillStyle = index === 0 ? "#ffffff" : "rgba(255,255,255,0.4)";
				roundRect(context, x, 24, 336, 6, 3);
				context.fill();
				x += 348;
			}
			drawAvatar(context, avatar.current, 40, 62, 72, username);
			context.fillStyle = "#ffffff";
			context.font = `600 32px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "left";
			context.textBaseline = "middle";
			context.fillText(username, 128, 98);
			context.font = `400 26px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "rgba(255,255,255,0.85)";
			context.fillText("2h", 128, 132);
			context.textBaseline = "alphabetic";
			context.font = `500 44px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "#ffffff";
			const height = drawParagraph(context, caption, {
				x: 48,
				y: 1560,
				maxWidth: 900,
				lineHeight: 60,
			});
			context.font = `400 28px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "rgba(255,255,255,0.8)";
			context.fillText(t("options.reply"), 48, Math.min(1850, height + 34));
			return;
		}

		if (mode === "dm") {
			target.width = 1080;
			target.height = 1920;
			context.fillStyle = "#000000";
			context.fillRect(0, 0, 1080, 1920);
			context.fillStyle = "#000000";
			context.fillRect(0, 0, 1080, 220);
			context.strokeStyle = "#262626";
			context.lineWidth = 2;
			context.beginPath();
			context.moveTo(0, 220);
			context.lineTo(1080, 220);
			context.stroke();
			context.fillStyle = "#ffffff";
			context.font = `400 64px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "left";
			context.textBaseline = "middle";
			context.fillText("‹", 36, 110);
			drawAvatar(context, avatar.current, 100, 60, 100, username);
			context.font = `600 40px ${MOCKUP_FONTS.sans}`;
			context.fillText(username, 230, 94);
			context.font = `400 28px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "#a8a8a8";
			context.fillText(t("options.active"), 230, 136);
			drawAvatar(context, avatar.current, 60, 480, 84, username);
			context.font = `400 38px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "#ffffff";
			const inLines = wrapLines(incoming, 620, (value) =>
				context.measureText(value).width,
			);
			const inHeight = inLines.length * 52 + 52;
			context.fillStyle = "#262626";
			roundRect(context, 168, 470, 700, inHeight, 38);
			context.fill();
			context.fillStyle = "#ffffff";
			drawParagraph(context, incoming, {
				x: 206,
				y: 516,
				maxWidth: 624,
				lineHeight: 52,
			});
			const bubbleHeight = 52 * wrapLines(outgoing, 620, (value) => context.measureText(value).width).length + 52;
			const bubbleY = 490 + inHeight + 40;
			const gradient = context.createLinearGradient(300, bubbleY, 1010, bubbleY + bubbleHeight);
			gradient.addColorStop(0, "#7b2ff7");
			gradient.addColorStop(1, "#f107a3");
			context.fillStyle = gradient;
			roundRect(context, 300, bubbleY, 720, bubbleHeight, 38);
			context.fill();
			context.fillStyle = "#ffffff";
			drawParagraph(context, outgoing, {
				x: 338,
				y: bubbleY + 46,
				maxWidth: 644,
				lineHeight: 52,
			});
			context.fillStyle = "#000000";
			context.fillRect(0, 1740, 1080, 180);
			context.strokeStyle = "#262626";
			context.beginPath();
			context.moveTo(0, 1740);
			context.lineTo(1080, 1740);
			context.stroke();
			context.strokeStyle = "#a8a8a8";
			context.lineWidth = 2;
			roundRect(context, 40, 1780, 880, 88, 44);
			context.stroke();
			context.fillStyle = "#a8a8a8";
			context.font = `400 32px ${MOCKUP_FONTS.sans}`;
			context.fillText(t("options.message"), 70, 1836);
			return;
		}

		target.width = 1080;
		target.height = 1350;
		context.fillStyle = dark ? "#000000" : "#ffffff";
		context.fillRect(0, 0, 1080, 1350);
		drawAvatar(context, avatar.current, 30, 28, 76, username);
		context.fillStyle = dark ? "#ffffff" : "#262626";
		context.font = `600 34px ${MOCKUP_FONTS.sans}`;
		context.textAlign = "left";
		context.textBaseline = "middle";
		context.fillText(username, 126, 54);
		context.font = `400 28px ${MOCKUP_FONTS.sans}`;
		context.fillStyle = dark ? "#a8a8a8" : "#8e8e8e";
		context.fillText(t("options.sponsored"), 126, 90);
		context.textAlign = "right";
		context.font = `700 44px ${MOCKUP_FONTS.sans}`;
		context.fillStyle = dark ? "#ffffff" : "#262626";
		context.fillText("···", 1040, 64);

		if (image.current) {
			drawCover(context, image.current, 0, 124, 1080, 900);
		} else {
			const gradient = context.createLinearGradient(0, 124, 1080, 1024);
			gradient.addColorStop(0, "#1b56fd");
			gradient.addColorStop(0.5, "#7b2ff7");
			gradient.addColorStop(1, "#f107a3");
			context.fillStyle = gradient;
			context.fillRect(0, 124, 1080, 900);
			context.fillStyle = "rgba(255,255,255,0.92)";
			context.font = `700 92px ${MOCKUP_FONTS.display}`;
			context.textAlign = "center";
			context.fillText("Toolify", 540, 560);
			context.font = `400 34px ${MOCKUP_FONTS.sans}`;
			context.fillText(t("options.imageHint"), 540, 620);
		}

		context.textAlign = "left";
		heart(context, 40, 1050, 54, true);
		context.strokeStyle = dark ? "#ffffff" : "#262626";
		context.lineWidth = 3;
		context.beginPath();
		context.arc(158, 1076, 24, 0, Math.PI * 2);
		context.stroke();
		context.beginPath();
		context.moveTo(196, 1058);
		context.lineTo(230, 1094);
		context.lineTo(196, 1094);
		context.closePath();
		context.stroke();
		context.fillStyle = dark ? "#ffffff" : "#262626";
		context.font = `600 30px ${MOCKUP_FONTS.sans}`;
		context.fillText(`${formatCount(Number(likes) || 0)} ${t("options.likes")}`, 36, 1158);
		context.font = `400 32px ${MOCKUP_FONTS.sans}`;
		const end = drawParagraph(context, caption, {
			x: 36,
			y: 1210,
			maxWidth: 1000,
			lineHeight: 44,
		});
		context.fillStyle = dark ? "#a8a8a8" : "#8e8e8e";
		context.font = `400 26px ${MOCKUP_FONTS.sans}`;
		context.fillText(t("options.time"), 36, Math.min(1320, end + 10));
	}, [avatarName, caption, dark, imageName, incoming, likes, mode, outgoing, t, username]);

	const download = async () => {
		if (!canvas.current) {
			return;
		}
		setRunning(true);
		try {
			const blob = await canvasBlob(canvas.current);
			downloadBlob(blob, `instagram-${mode}.png`);
			notify.success(t("options.downloaded"));
		} catch {
			setError(t("options.failed"));
		} finally {
			setRunning(false);
		}
	};

	const loadInto = async (
		picked: File,
		target: React.RefObject<HTMLImageElement | null>,
		setName: (value: string) => void,
	) => {
		const url = URL.createObjectURL(picked);
		urls.current.push(url);
		try {
			target.current = await loadCanvasImage(url);
			setName(picked.name);
		} catch {
			setError(t("options.imageError"));
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
			<div className="flex min-w-0 flex-col gap-4">
				<TabsRoot onValueChange={(value) => setMode(value as Mode)} value={mode}>
					<TabsList variant="segment">
						<TabsTab className={tabActiveClass} value="post">
							{t("options.post")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="story">
							{t("options.story")}
						</TabsTab>
						<TabsTab className={tabActiveClass} value="dm">
							{t("options.dm")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>
				<div className="overflow-hidden rounded-xl border border-border bg-surface-2 p-3">
					<canvas
						aria-label={t("options.preview")}
						className="mx-auto h-auto w-full max-w-sm rounded-lg"
						data-testid="instagram-canvas"
						ref={canvas}
					/>
				</div>
				<SmoothButton
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

			<div className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-surface p-5 md:p-6">
				<Field>
					<FieldLabel htmlFor="instagram-username">
						{t("options.username")}
					</FieldLabel>
					<FieldControl
						className={inputClass}
						id="instagram-username"
						onChange={(event) => setUsername(event.target.value)}
						value={username}
					/>
				</Field>

				{mode === "dm" ? (
					<>
						<Field>
							<FieldLabel htmlFor="instagram-incoming">
								{t("options.incoming")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="instagram-incoming"
								onChange={(event) => setIncoming(event.target.value)}
								value={incoming}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="instagram-outgoing">
								{t("options.outgoing")}
							</FieldLabel>
							<FieldControl
								className={inputClass}
								id="instagram-outgoing"
								onChange={(event) => setOutgoing(event.target.value)}
								value={outgoing}
							/>
						</Field>
					</>
				) : (
					<>
						<Field>
							<FieldLabel htmlFor="instagram-caption">
								{t("options.caption")}
							</FieldLabel>
							<textarea
								className="min-h-24 w-full resize-y rounded-md border border-border bg-surface-2 p-3 text-small text-text outline-none focus-visible:border-blue-500"
								id="instagram-caption"
								onChange={(event) => setCaption(event.target.value)}
								rows={3}
								value={caption}
							/>
						</Field>
						{mode === "post" ? (
							<>
								<Field>
									<FieldLabel htmlFor="instagram-likes">
										{t("options.likesLabel")}
									</FieldLabel>
									<FieldControl
										className={inputClass}
										id="instagram-likes"
										inputMode="numeric"
										onChange={(event) =>
											setLikes(event.target.value.replace(/[^0-9]/g, ""))
										}
										value={likes}
									/>
								</Field>
								<div className="flex items-center justify-between gap-3">
									<span className="text-small font-medium">{t("options.dark")}</span>
									<Switch
										aria-label={t("options.dark")}
										checked={dark}
										onCheckedChange={setDark}
									/>
								</div>
							</>
						) : null}
						<input
							accept=".png,.jpg,.jpeg,.webp"
							className="sr-only"
							onChange={(event) => {
								const picked = event.target.files?.[0];
								if (picked) {
									loadInto(picked, image, setImageName);
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
							<ImagePlus aria-hidden="true" className="size-4" />
							{imageName ?? t("options.image")}
						</SmoothButton>
					</>
				)}

				<input
					accept=".png,.jpg,.jpeg,.webp"
					className="sr-only"
					onChange={(event) => {
						const picked = event.target.files?.[0];
						if (picked) {
							loadInto(picked, avatar, setAvatarName);
						}
						event.target.value = "";
					}}
					ref={avatarInput}
					type="file"
				/>
				<SmoothButton
					onClick={() => avatarInput.current?.click()}
					size="sm"
					variant="secondary"
				>
					<ImagePlus aria-hidden="true" className="size-4" />
					{avatarName ?? t("options.avatar")}
				</SmoothButton>
			</div>
		</div>
	);
}