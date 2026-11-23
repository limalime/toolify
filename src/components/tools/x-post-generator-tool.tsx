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
	wrapLines,
} from "@/lib/images/mockup";

type Mode = "post" | "profile";

export default function XPostGeneratorTool() {
	const t = useTranslations("tools.x-post-generator");
	const [mode, setMode] = useState<Mode>("post");
	const [name, setName] = useState("Toolify");
	const [handle, setHandle] = useState("toolify");
	const [text, setText] = useState(t("options.sampleText"));
	const [likes, setLikes] = useState("2400");
	const [reposts, setReposts] = useState("318");
	const [bio, setBio] = useState(t("options.sampleBio"));
	const [dark, setDark] = useState(true);
	const [avatarName, setAvatarName] = useState<string | null>(null);
	const [imageName, setImageName] = useState<string | null>(null);
	const [bannerName, setBannerName] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const avatar = useRef<HTMLImageElement | null>(null);
	const image = useRef<HTMLImageElement | null>(null);
	const banner = useRef<HTMLImageElement | null>(null);
	const urls = useRef<string[]>([]);
	const avatarInput = useRef<HTMLInputElement>(null);
	const imageInput = useRef<HTMLInputElement>(null);
	const bannerInput = useRef<HTMLInputElement>(null);

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
		const ink = dark ? "#e7e9ea" : "#0f1419";
		const muted = dark ? "#71767b" : "#536471";
		const surface = dark ? "#000000" : "#ffffff";
		const line = dark ? "#2f3336" : "#eff3f4";

		if (mode === "profile") {
			target.width = 1200;
			target.height = 675;
			context.fillStyle = surface;
			context.fillRect(0, 0, 1200, 675);
			if (banner.current) {
				drawCover(context, banner.current, 0, 0, 1200, 300);
			} else {
				const gradient = context.createLinearGradient(0, 0, 1200, 300);
				gradient.addColorStop(0, "#1b56fd");
				gradient.addColorStop(1, "#7b2ff7");
				context.fillStyle = gradient;
				context.fillRect(0, 0, 1200, 300);
			}
			context.strokeStyle = surface;
			context.lineWidth = 8;
			context.beginPath();
			context.arc(140, 300, 80, 0, Math.PI * 2);
			context.stroke();
			drawAvatar(context, avatar.current, 60, 220, 160, name);
			context.fillStyle = ink;
			context.font = `700 44px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "left";
			context.textBaseline = "alphabetic";
			context.fillText(name, 60, 450);
			context.fillStyle = muted;
			context.font = `400 30px ${MOCKUP_FONTS.sans}`;
			context.fillText(`@${handle}`, 60, 496);
			context.fillStyle = ink;
			context.font = `400 30px ${MOCKUP_FONTS.sans}`;
			const end = drawParagraph(context, bio, {
				x: 60,
				y: 552,
				maxWidth: 700,
				lineHeight: 40,
			});
			context.fillStyle = muted;
			context.font = `400 28px ${MOCKUP_FONTS.sans}`;
			context.fillText("Following  128   Followers  24.6K", 60, Math.min(640, end + 20));
			context.fillStyle = ink;
			context.strokeStyle = dark ? "#536471" : "#cfd9de";
			context.lineWidth = 2;
			context.beginPath();
			const buttonX = 880;
			const buttonY = 410;
			context.roundRect?.(buttonX, buttonY, 220, 64, 32);
			context.stroke();
			context.font = `600 28px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "center";
			context.fillText(t("options.follow"), buttonX + 110, buttonY + 42);
			return;
		}

		target.width = 1200;
		const bodyWidth = 960;
		context.font = `400 36px ${MOCKUP_FONTS.sans}`;
		let textHeight = 0;
		if (image.current) {
			const imageHeight = 380;
			const lines = wrapLines(text, bodyWidth, (value) => context.measureText(value).width);
			textHeight = 210 + lines.length * 48 + imageHeight + 180;
		} else {
			const lines = wrapLines(text, bodyWidth, (value) => context.measureText(value).width);
			textHeight = 210 + lines.length * 48 + 190;
		}
		target.height = Math.max(420, textHeight);
		context.fillStyle = surface;
		context.fillRect(0, 0, 1200, target.height);
		drawAvatar(context, avatar.current, 48, 40, 96, name);
		context.fillStyle = ink;
		context.font = `700 34px ${MOCKUP_FONTS.sans}`;
		context.textAlign = "left";
		context.textBaseline = "alphabetic";
		context.fillText(name, 168, 82);
		context.fillStyle = muted;
		context.font = `400 30px ${MOCKUP_FONTS.sans}`;
		context.fillText(`@${handle}`, 168, 120);
		context.fillStyle = ink;
		context.font = `400 36px ${MOCKUP_FONTS.sans}`;
		const bodyEnd = drawParagraph(context, text, {
			x: 48,
			y: 190,
			maxWidth: bodyWidth,
			lineHeight: 48,
		});
		let cursor = bodyEnd + 8;
		if (image.current) {
			drawCover(context, image.current, 48, cursor, 960, 380);
			cursor += 400;
		}
		context.fillStyle = muted;
		context.font = `400 28px ${MOCKUP_FONTS.sans}`;
		context.fillText("9:41 AM · Nov 22, 2026", 48, cursor + 20);
		cursor += 64;
		context.strokeStyle = line;
		context.beginPath();
		context.moveTo(48, cursor);
		context.lineTo(1152, cursor);
		context.stroke();
		cursor += 48;
		context.fillStyle = muted;
		context.font = `400 28px ${MOCKUP_FONTS.sans}`;
		context.fillText(`${formatCount(Number(reposts) || 0)} Reposts`, 48, cursor);
		context.fillText(`${formatCount(Number(likes) || 0)} Likes`, 360, cursor);
		context.fillText(`${formatCount(Number(likes) * 38 || 0)} Views`, 680, cursor);
	}, [avatarName, bannerName, bio, dark, handle, imageName, likes, mode, name, reposts, t, text]);

	const download = async () => {
		if (!canvas.current) {
			return;
		}
		setRunning(true);
		try {
			const blob = await canvasBlob(canvas.current);
			downloadBlob(blob, `x-${mode}.png`);
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
						<TabsTab className={tabActiveClass} value="profile">
							{t("options.profile")}
						</TabsTab>
						<TabsIndicator />
					</TabsList>
				</TabsRoot>
				<div className="overflow-hidden rounded-xl border border-border bg-surface-2 p-3">
					<canvas
						aria-label={t("options.preview")}
						className="mx-auto h-auto w-full max-w-xl rounded-lg"
						data-testid="x-canvas"
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
					<FieldLabel htmlFor="x-name">{t("options.name")}</FieldLabel>
					<FieldControl
						className={inputClass}
						id="x-name"
						onChange={(event) => setName(event.target.value)}
						value={name}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="x-handle">{t("options.handle")}</FieldLabel>
					<FieldControl
						className={inputClass}
						id="x-handle"
						onChange={(event) =>
							setHandle(event.target.value.replace(/^@/, "").replace(/\s/g, ""))
						}
						value={handle}
					/>
				</Field>
				{mode === "post" ? (
					<>
						<Field>
							<FieldLabel htmlFor="x-text">{t("options.text")}</FieldLabel>
							<textarea
								className="min-h-32 w-full resize-y rounded-md border border-border bg-surface-2 p-3 text-small text-text outline-none focus-visible:border-blue-500"
								id="x-text"
								onChange={(event) => setText(event.target.value)}
								rows={5}
								value={text}
							/>
						</Field>
						<div className="grid grid-cols-2 gap-3">
							<Field>
								<FieldLabel htmlFor="x-likes">{t("options.likes")}</FieldLabel>
								<FieldControl
									className={inputClass}
									id="x-likes"
									inputMode="numeric"
									onChange={(event) =>
										setLikes(event.target.value.replace(/[^0-9]/g, ""))
									}
									value={likes}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="x-reposts">{t("options.reposts")}</FieldLabel>
								<FieldControl
									className={inputClass}
									id="x-reposts"
									inputMode="numeric"
									onChange={(event) =>
										setReposts(event.target.value.replace(/[^0-9]/g, ""))
									}
									value={reposts}
								/>
							</Field>
						</div>
					</>
				) : (
					<Field>
						<FieldLabel htmlFor="x-bio">{t("options.bio")}</FieldLabel>
						<textarea
							className="min-h-24 w-full resize-y rounded-md border border-border bg-surface-2 p-3 text-small text-text outline-none focus-visible:border-blue-500"
							id="x-bio"
							onChange={(event) => setBio(event.target.value)}
							rows={3}
							value={bio}
						/>
					</Field>
				)}
				<div className="flex items-center justify-between gap-3">
					<span className="text-small font-medium">{t("options.dark")}</span>
					<Switch
						aria-label={t("options.dark")}
						checked={dark}
						onCheckedChange={setDark}
					/>
				</div>

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

				{mode === "post" ? (
					<>
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
				) : (
					<>
						<input
							accept=".png,.jpg,.jpeg,.webp"
							className="sr-only"
							onChange={(event) => {
								const picked = event.target.files?.[0];
								if (picked) {
									loadInto(picked, banner, setBannerName);
								}
								event.target.value = "";
							}}
							ref={bannerInput}
							type="file"
						/>
						<SmoothButton
							onClick={() => bannerInput.current?.click()}
							size="sm"
							variant="secondary"
						>
							<ImagePlus aria-hidden="true" className="size-4" />
							{bannerName ?? t("options.banner")}
						</SmoothButton>
					</>
				)}
			</div>
		</div>
	);
}