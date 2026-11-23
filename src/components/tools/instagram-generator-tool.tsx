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
import type { Ink } from "@/lib/images/social-icons";
import {
	cameraIcon,
	commentIcon,
	dotsIcon,
	heart,
	imageIcon,
	microphoneIcon,
	phoneIcon,
	repostIcon,
	shareIcon,
	videoIcon,
} from "@/lib/images/social-icons";

type Mode = "post" | "story" | "dm";

function drawCaption(
	context: CanvasRenderingContext2D,
	username: string,
	caption: string,
	options: { x: number; y: number; maxWidth: number; lineHeight: number },
	ink: Ink,
): number {
	context.direction = "ltr";
	context.textAlign = "left";
	context.textBaseline = "alphabetic";
	context.fillStyle = ink;
	context.font = `600 32px ${MOCKUP_FONTS.sans}`;
	context.fillText(username, options.x, options.y);
	let cursorX =
		options.x +
		context.measureText(username).width +
		context.measureText(" ").width;
	let cursorY = options.y;
	const space = context.measureText(" ").width;
	context.font = `400 32px ${MOCKUP_FONTS.sans}`;
	for (const word of caption.split(/\s+/).filter(Boolean)) {
		const width = context.measureText(word).width;
		if (cursorX + width > options.x + options.maxWidth && cursorX > options.x) {
			cursorY += options.lineHeight;
			cursorX = options.x;
		}
		context.fillText(word, cursorX, cursorY);
		cursorX += width + space;
	}
	return cursorY + options.lineHeight;
}

export default function InstagramGeneratorTool() {
	const t = useTranslations("tools.instagram-generator");
	const [mode, setMode] = useState<Mode>("post");
	const [username, setUsername] = useState("toolify.bond");
	const [caption, setCaption] = useState(t("options.sampleCaption"));
	const [likes, setLikes] = useState("46300");
	const [comments, setComments] = useState("110");
	const [reposts, setReposts] = useState("84");
	const [shares, setShares] = useState("312");
	const [dark, setDark] = useState(false);
	const [incoming, setIncoming] = useState(t("options.sampleIncoming"));
	const [outgoing, setOutgoing] = useState(t("options.sampleOutgoing"));
	const [imageName, setImageName] = useState<string | null>(null);
	const [avatarName, setAvatarName] = useState<string | null>(null);
	const [avatarBName, setAvatarBName] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const image = useRef<HTMLImageElement | null>(null);
	const avatar = useRef<HTMLImageElement | null>(null);
	const avatarB = useRef<HTMLImageElement | null>(null);
	const urls = useRef<string[]>([]);
	const imageInput = useRef<HTMLInputElement>(null);
	const avatarInput = useRef<HTMLInputElement>(null);
	const avatarBInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		return () => {
			for (const url of urls.current) {
				URL.revokeObjectURL(url);
			}
		};
	}, []);

	// image names change after the ref loads, repaint when they do
	// biome-ignore lint/correctness/useExhaustiveDependencies: names drive the repaint
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
			const bottom = context.createLinearGradient(0, 1520, 0, 1920);
			bottom.addColorStop(0, "rgba(0,0,0,0)");
			bottom.addColorStop(1, "rgba(0,0,0,0.72)");
			context.fillStyle = bottom;
			context.fillRect(0, 1520, 1080, 400);

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
			context.fillText(username, 128, 88);
			context.font = `400 26px ${MOCKUP_FONTS.sans}`;
			context.fillStyle = "rgba(255,255,255,0.85)";
			context.fillText("2h", 128, 122);
			const dotsX = 986;
			dotsIcon(context, dotsX, 98, "#ffffff");

			context.strokeStyle = "#ffffff";
			context.lineWidth = 3;
			roundRect(context, 40, 1762, 748, 88, 44);
			context.stroke();
			context.fillStyle = "rgba(255,255,255,0.92)";
			context.font = `400 32px ${MOCKUP_FONTS.sans}`;
			context.textBaseline = "middle";
			context.fillText(t("options.sendMessage"), 78, 1808);
			heart(context, 848, 1780, 50, false, "#ffffff");
			commentIcon(context, 928, 1780, 50, "#ffffff");
			shareIcon(context, 1008, 1780, 50, "#ffffff");
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
			drawAvatar(context, avatar.current, 96, 60, 100, username);
			context.font = `600 38px ${MOCKUP_FONTS.sans}`;
			context.fillText(username, 224, 92);
			context.fillStyle = "#1cd14f";
			context.beginPath();
			context.arc(232, 142, 8, 0, Math.PI * 2);
			context.fill();
			context.fillStyle = "#a8a8a8";
			context.font = `400 28px ${MOCKUP_FONTS.sans}`;
			context.fillText(t("options.active"), 252, 148);
			phoneIcon(context, 900, 62, 46, "#ffffff");
			videoIcon(context, 980, 62, 50, "#ffffff");

			context.font = `400 38px ${MOCKUP_FONTS.sans}`;
			const bubbleWidth = 640;
			const inLines = wrapLines(
				incoming,
				bubbleWidth - 84,
				(value) => context.measureText(value).width,
			);
			const inHeight = inLines.length * 54 + 64;
			const inY = 292;
			drawAvatar(context, avatarB.current, 36, inY + 6, 80, "B");
			context.fillStyle = "#262626";
			context.beginPath();
			context.moveTo(146, inY + 26);
			context.lineTo(118, inY + 12);
			context.lineTo(146, inY + 58);
			context.closePath();
			context.fill();
			roundRect(context, 146, inY, bubbleWidth, inHeight, 44);
			context.fill();
			context.fillStyle = "#ffffff";
			drawParagraph(context, incoming, {
				x: 190,
				y: inY + 56,
				maxWidth: bubbleWidth - 84,
				lineHeight: 54,
			});

			const outLines = wrapLines(
				outgoing,
				bubbleWidth - 84,
				(value) => context.measureText(value).width,
			);
			const outHeight = outLines.length * 54 + 64;
			let cursorY = inY + inHeight + 60;
			const photoWidth = 620;
			const photoHeight = 440;
			const photoX = 1080 - 40 - photoWidth;
			context.save();
			roundRect(context, photoX, cursorY, photoWidth, photoHeight, 44);
			context.clip();
			if (image.current) {
				drawCover(
					context,
					image.current,
					photoX,
					cursorY,
					photoWidth,
					photoHeight,
				);
			} else {
				const gradient = context.createLinearGradient(
					photoX,
					cursorY,
					photoX + photoWidth,
					cursorY + photoHeight,
				);
				gradient.addColorStop(0, "#7b2ff7");
				gradient.addColorStop(1, "#f107a3");
				context.fillStyle = gradient;
				context.fillRect(photoX, cursorY, photoWidth, photoHeight);
				imageIcon(context, 520, cursorY + 196, 76, "rgba(255,255,255,0.9)");
			}
			context.restore();
			cursorY += photoHeight + 34;
			const outX = 1080 - 40 - bubbleWidth;
			const gradient = context.createLinearGradient(
				outX,
				cursorY,
				outX + bubbleWidth,
				cursorY + outHeight,
			);
			gradient.addColorStop(0, "#7b2ff7");
			gradient.addColorStop(1, "#f107a3");
			context.fillStyle = gradient;
			roundRect(context, outX, cursorY, bubbleWidth, outHeight, 44);
			context.fill();
			context.fillStyle = "#ffffff";
			drawParagraph(context, outgoing, {
				x: outX + 42,
				y: cursorY + 56,
				maxWidth: bubbleWidth - 84,
				lineHeight: 54,
			});

			context.fillStyle = "#000000";
			context.fillRect(0, 1740, 1080, 180);
			context.strokeStyle = "#262626";
			context.beginPath();
			context.moveTo(0, 1740);
			context.lineTo(1080, 1740);
			context.stroke();
			context.strokeStyle = "#a8a8a8";
			context.lineWidth = 2.4;
			context.beginPath();
			context.arc(70, 1832, 30, 0, Math.PI * 2);
			context.stroke();
			context.beginPath();
			context.moveTo(70, 1820);
			context.lineTo(70, 1844);
			context.moveTo(58, 1832);
			context.lineTo(82, 1832);
			context.stroke();
			context.strokeStyle = "#363636";
			roundRect(context, 124, 1786, 500, 92, 46);
			context.stroke();
			context.fillStyle = "#a8a8a8";
			context.font = `400 30px ${MOCKUP_FONTS.sans}`;
			context.textBaseline = "middle";
			context.fillText(t("options.message"), 162, 1834);
			const cameraGradient = context.createLinearGradient(636, 1792, 700, 1856);
			cameraGradient.addColorStop(0, "#7b2ff7");
			cameraGradient.addColorStop(1, "#f107a3");
			context.fillStyle = cameraGradient;
			context.beginPath();
			context.arc(672, 1832, 32, 0, Math.PI * 2);
			context.fill();
			cameraIcon(context, 655, 1815, 36, "#ffffff");
			microphoneIcon(context, 750, 1812, 44, "#a8a8a8");
			imageIcon(context, 880, 1812, 44, "#a8a8a8");
			return;
		}

		target.width = 1080;
		target.height = 1350;
		const ink = dark ? "#ffffff" : "#262626";
		const muted = dark ? "#a8a8a8" : "#8e8e8e";
		context.fillStyle = dark ? "#000000" : "#ffffff";
		context.fillRect(0, 0, 1080, 1350);
		drawAvatar(context, avatar.current, 30, 28, 76, username);
		context.fillStyle = ink;
		context.font = `600 34px ${MOCKUP_FONTS.sans}`;
		context.textAlign = "left";
		context.textBaseline = "middle";
		context.fillText(username, 126, 54);
		context.font = `400 28px ${MOCKUP_FONTS.sans}`;
		context.fillStyle = muted;
		context.fillText(t("options.suggested"), 126, 90);
		dotsIcon(context, 966, 64, ink);

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
		context.textBaseline = "alphabetic";
		heart(context, 40, 1054, 52, true, "#ed4956");
		context.fillStyle = ink;
		context.font = `600 30px ${MOCKUP_FONTS.sans}`;
		context.fillText(formatCount(Number(likes) || 0), 104, 1094);
		commentIcon(context, 250, 1054, 52, ink);
		context.fillStyle = ink;
		context.fillText(formatCount(Number(comments) || 0), 314, 1094);
		repostIcon(context, 450, 1054, 52, ink);
		context.fillStyle = ink;
		context.fillText(formatCount(Number(reposts) || 0), 516, 1094);
		shareIcon(context, 640, 1054, 52, ink);
		context.fillStyle = ink;
		context.fillText(formatCount(Number(shares) || 0), 706, 1094);

		const captionEnd = drawCaption(
			context,
			username,
			caption,
			{ x: 36, y: 1182, maxWidth: 1004, lineHeight: 44 },
			ink,
		);
		context.fillStyle = muted;
		context.font = `400 26px ${MOCKUP_FONTS.sans}`;
		context.fillText(t("options.time"), 36, Math.min(1324, captionEnd + 14));
	}, [
		avatarBName,
		avatarName,
		caption,
		comments,
		dark,
		imageName,
		incoming,
		likes,
		mode,
		outgoing,
		reposts,
		shares,
		t,
		username,
	]);

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
				<TabsRoot
					onValueChange={(value) => setMode(value as Mode)}
					value={mode}
				>
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
						<input
							accept=".png,.jpg,.jpeg,.webp"
							aria-label={t("options.image")}
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
				) : (
					<>
						{mode === "post" ? (
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
						) : null}
						{mode === "post" ? (
							<>
								<div className="grid grid-cols-2 gap-3">
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
									<Field>
										<FieldLabel htmlFor="instagram-comments">
											{t("options.commentsLabel")}
										</FieldLabel>
										<FieldControl
											className={inputClass}
											id="instagram-comments"
											inputMode="numeric"
											onChange={(event) =>
												setComments(event.target.value.replace(/[^0-9]/g, ""))
											}
											value={comments}
										/>
									</Field>
								</div>
								<div className="grid grid-cols-2 gap-3">
									<Field>
										<FieldLabel htmlFor="instagram-reposts">
											{t("options.repostsLabel")}
										</FieldLabel>
										<FieldControl
											className={inputClass}
											id="instagram-reposts"
											inputMode="numeric"
											onChange={(event) =>
												setReposts(event.target.value.replace(/[^0-9]/g, ""))
											}
											value={reposts}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="instagram-shares">
											{t("options.sharesLabel")}
										</FieldLabel>
										<FieldControl
											className={inputClass}
											id="instagram-shares"
											inputMode="numeric"
											onChange={(event) =>
												setShares(event.target.value.replace(/[^0-9]/g, ""))
											}
											value={shares}
										/>
									</Field>
								</div>
								<div className="flex items-center justify-between gap-3">
									<span className="text-small font-medium">
										{t("options.dark")}
									</span>
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
							aria-label={t("options.image")}
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
					aria-label={t(
						mode === "dm" ? "options.recipientAvatar" : "options.avatar",
					)}
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
				{avatarBName || mode === "dm" ? (
					<input
						accept=".png,.jpg,.jpeg,.webp"
						aria-label={t("options.replierAvatar")}
						className="sr-only"
						onChange={(event) => {
							const picked = event.target.files?.[0];
							if (picked) {
								loadInto(picked, avatarB, setAvatarBName);
							}
							event.target.value = "";
						}}
						ref={avatarBInput}
						type="file"
					/>
				) : null}
				<div className="flex flex-wrap gap-2">
					<SmoothButton
						onClick={() => avatarInput.current?.click()}
						size="sm"
						variant="secondary"
					>
						<ImagePlus aria-hidden="true" className="size-4" />
						{avatarName ??
							t(mode === "dm" ? "options.recipientAvatar" : "options.avatar")}
					</SmoothButton>
					{mode === "dm" ? (
						<SmoothButton
							onClick={() => avatarBInput.current?.click()}
							size="sm"
							variant="secondary"
						>
							<ImagePlus aria-hidden="true" className="size-4" />
							{avatarBName ?? t("options.replierAvatar")}
						</SmoothButton>
					) : null}
				</div>
			</div>
		</div>
	);
}
