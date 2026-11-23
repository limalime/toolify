"use client";

import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import SmoothButton from "@/components/smoothui/smooth-button";
import Switch from "@/components/smoothui/switch";
import { inputClass, selectTriggerClass } from "@/lib/control-classes";
import { downloadBlob } from "@/lib/images/download";
import {
	canvasBlob,
	drawAvatar,
	drawParagraph,
	loadCanvasImage,
	MOCKUP_FONTS,
	roundRect,
} from "@/lib/images/mockup";
import {
	cameraIcon,
	dotsIcon,
	paperclipIcon,
	phoneIcon,
	smileyIcon,
	videoIcon,
} from "@/lib/images/social-icons";

export type ChatVariant = "whatsapp" | "messenger" | "imessage" | "instagram";

interface Theme {
	background: string;
	header: string;
	incoming: string;
	outgoing: string;
	text: string;
	incomingText: string;
	outgoingText: string;
	meta: string;
	accent: string;
	footer: string;
}

const LIGHT: Record<Exclude<ChatVariant, "imessage">, Theme> = {
	whatsapp: {
		background: "#efeae2",
		header: "#f0f2f5",
		incoming: "#ffffff",
		outgoing: "#d9fdd3",
		text: "#111b21",
		incomingText: "#111b21",
		outgoingText: "#111b21",
		meta: "#667781",
		accent: "#00a884",
		footer: "#f0f2f5",
	},
	messenger: {
		background: "#ffffff",
		header: "#ffffff",
		incoming: "#f0f0f0",
		outgoing: "#0084ff",
		text: "#050505",
		incomingText: "#050505",
		outgoingText: "#ffffff",
		meta: "#65676b",
		accent: "#0084ff",
		footer: "#ffffff",
	},
	instagram: {
		background: "#ffffff",
		header: "#ffffff",
		incoming: "#efefef",
		outgoing: "#3797f0",
		text: "#000000",
		incomingText: "#000000",
		outgoingText: "#ffffff",
		meta: "#8e8e8e",
		accent: "#3797f0",
		footer: "#ffffff",
	},
};

const DARK: Record<Exclude<ChatVariant, "imessage">, Theme> = {
	whatsapp: {
		background: "#0b141a",
		header: "#202c33",
		incoming: "#202c33",
		outgoing: "#005c4b",
		text: "#e9edef",
		incomingText: "#e9edef",
		outgoingText: "#e9edef",
		meta: "#8696a0",
		accent: "#00a884",
		footer: "#202c33",
	},
	messenger: {
		background: "#18191a",
		header: "#242526",
		incoming: "#3a3b3c",
		outgoing: "#0084ff",
		text: "#e4e6eb",
		incomingText: "#e4e6eb",
		outgoingText: "#ffffff",
		meta: "#b0b3b8",
		accent: "#0084ff",
		footer: "#242526",
	},
	instagram: {
		background: "#000000",
		header: "#000000",
		incoming: "#262626",
		outgoing: "#3797f0",
		text: "#f5f5f5",
		incomingText: "#f5f5f5",
		outgoingText: "#ffffff",
		meta: "#a8a8a8",
		accent: "#3797f0",
		footer: "#000000",
	},
};

const IMESSAGE_LIGHT: Theme = {
	background: "#ffffff",
	header: "#f7f7f7",
	incoming: "#e9e9eb",
	outgoing: "#007aff",
	text: "#000000",
	incomingText: "#000000",
	outgoingText: "#ffffff",
	meta: "#8e8e93",
	accent: "#007aff",
	footer: "#f7f7f7",
};

const IMESSAGE_DARK: Theme = {
	background: "#000000",
	header: "#1c1c1e",
	incoming: "#26252a",
	outgoing: "#0a84ff",
	text: "#ffffff",
	incomingText: "#ffffff",
	outgoingText: "#ffffff",
	meta: "#8e8e93",
	accent: "#0a84ff",
	footer: "#1c1c1e",
};

function themeFor(variant: ChatVariant, dark: boolean): Theme {
	if (variant === "imessage") {
		return dark ? IMESSAGE_DARK : IMESSAGE_LIGHT;
	}
	return dark ? DARK[variant] : LIGHT[variant];
}

interface Message {
	id: string;
	side: "in" | "out";
	text: string;
	time: string;
}

let counter = 0;
function newMessage(side: "in" | "out", text: string, time: string): Message {
	counter += 1;
	return { id: `m${counter}`, side, text, time };
}

type ChatSlug =
	| "messenger-generator"
	| "whatsapp-generator"
	| "imessage-generator";

export default function ChatMockupTool({
	variant,
	slug,
}: {
	variant: ChatVariant;
	slug: ChatSlug;
}) {
	const t = useTranslations(`tools.${slug}`);
	const [contact, setContact] = useState(
		variant === "whatsapp"
			? "Alex"
			: variant === "messenger"
				? "Sam Rivera"
				: "Jamie",
	);
	const [dark, setDark] = useState(variant === "imessage");
	const [messages, setMessages] = useState<Message[]>([
		newMessage("in", t("options.sampleIn"), "09:41"),
		newMessage("out", t("options.sampleOut"), "09:42"),
		newMessage("in", t("options.sampleFollow"), "09:42"),
	]);
	const [avatarName, setAvatarName] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const avatar = useRef<HTMLImageElement | null>(null);
	const avatarUrl = useRef<string | null>(null);
	const avatarInput = useRef<HTMLInputElement>(null);

	const theme = themeFor(variant, dark);

	useEffect(() => {
		const target = canvas.current;
		if (!target) {
			return;
		}
		const width = 1080;
		const context = target.getContext("2d");
		if (!context) {
			return;
		}
		context.font = `400 36px ${MOCKUP_FONTS.sans}`;
		const bubbleWidth = 720;
		const rows = messages.map((message) => {
			const words: string[] = [];
			for (const paragraph of message.text.split("\n")) {
				words.push(...paragraph.split(/\s+/).filter(Boolean));
			}
			let line = "";
			let count = 1;
			for (const word of words) {
				const next = line ? `${line} ${word}` : word;
				if (context.measureText(next).width > bubbleWidth - 72 && line) {
					count += 1;
					line = word;
				} else {
					line = next;
				}
			}
			return Math.max(1, count);
		});
		const header = 170;
		const bubbleGap = 26;
		const lineHeight = 48;
		const bubblePadding = 36;
		const timestampLine = 32;
		let content = header + 40;
		for (const lines of rows) {
			content +=
				lines * lineHeight + bubblePadding * 2 + timestampLine + bubbleGap;
		}
		const footer = 130;
		const height = content + footer;
		target.width = width;
		target.height = height;
		context.clearRect(0, 0, width, height);
		context.fillStyle = theme.background;
		context.fillRect(0, 0, width, height);

		context.fillStyle = theme.header;
		context.fillRect(0, 0, width, header);
		context.fillStyle = theme.accent;
		context.font = `400 64px ${MOCKUP_FONTS.sans}`;
		context.textAlign = "left";
		context.textBaseline = "middle";
		context.fillText("‹", 36, header / 2);
		drawAvatar(context, avatar.current, 110, 36, 96, contact);
		context.fillStyle = theme.text;
		context.font = `600 40px ${MOCKUP_FONTS.sans}`;
		context.fillText(contact || " ", 232, header / 2 - 14);
		context.fillStyle = theme.meta;
		context.font = `400 28px ${MOCKUP_FONTS.sans}`;
		context.fillText("online", 232, header / 2 + 30);
		if (variant === "whatsapp") {
			videoIcon(context, 810, header / 2 - 26, 46, theme.accent);
			phoneIcon(context, 890, header / 2 - 24, 44, theme.accent);
			dotsIcon(context, 978, header / 2, theme.accent);
		}

		let y = header + 40;
		const insideTime = variant === "whatsapp";
		for (const [index, message] of messages.entries()) {
			const lines = rows[index] ?? 1;
			const bubbleHeight =
				lines * lineHeight + bubblePadding * 2 + (insideTime ? 34 : 0);
			const bubbleW = Math.min(
				bubbleWidth,
				Math.max(
					140,
					Math.max(
						...message.text
							.split("\n")
							.map((line) => context.measureText(line).width),
					) +
						bubblePadding * 2,
				),
			);
			const outgoing = message.side === "out";
			const x = outgoing ? width - 40 - bubbleW : 40;
			context.fillStyle = outgoing ? theme.outgoing : theme.incoming;
			roundRect(context, x, y, bubbleW, bubbleHeight, 28);
			context.fill();
			context.fillStyle = outgoing ? theme.outgoingText : theme.incomingText;
			context.font = `400 36px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "left";
			context.textBaseline = "alphabetic";
			drawParagraph(context, message.text, {
				x: x + bubblePadding,
				y: y + bubblePadding + 34,
				maxWidth: bubbleW - bubblePadding * 2,
				lineHeight,
			});
			context.fillStyle = theme.meta;
			context.font = `400 24px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "right";
			context.fillText(
				message.time,
				x + bubbleW - 24,
				insideTime ? y + bubbleHeight - 18 : y + bubbleHeight + 26,
			);
			context.textAlign = "left";
			y += bubbleHeight + (insideTime ? bubbleGap : timestampLine + bubbleGap);
		}

		context.fillStyle = theme.footer;
		context.fillRect(0, height - footer, width, footer);
		if (variant === "whatsapp") {
			smileyIcon(context, 48, height - footer / 2 - 22, 44, theme.meta);
			context.strokeStyle = theme.meta;
			context.lineWidth = 2;
			roundRect(context, 116, height - footer + 26, 700, footer - 52, 28);
			context.stroke();
			context.fillStyle = theme.meta;
			context.font = `400 30px ${MOCKUP_FONTS.sans}`;
			context.textAlign = "left";
			context.textBaseline = "middle";
			context.fillText(
				t("options.messagePlaceholder"),
				152,
				height - footer / 2,
			);
			paperclipIcon(context, 866, height - footer / 2 - 21, 42, theme.meta);
			cameraIcon(context, 968, height - footer / 2 - 22, 44, theme.meta);
			return;
		}
		context.strokeStyle = theme.meta;
		context.lineWidth = 2;
		roundRect(context, 40, height - footer + 26, width - 160, footer - 52, 28);
		context.stroke();
		context.fillStyle = theme.meta;
		context.font = `400 30px ${MOCKUP_FONTS.sans}`;
		context.fillText(
			t("options.messagePlaceholder"),
			70,
			height - footer / 2 + 10,
		);
		context.fillStyle = theme.accent;
		context.beginPath();
		context.arc(width - 70, height - footer / 2, 36, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = "#ffffff";
		context.font = `700 30px ${MOCKUP_FONTS.sans}`;
		context.textAlign = "center";
		context.fillText("↑", width - 70, height - footer / 2 + 11);
	}, [contact, messages, theme, t, variant]);

	const download = async () => {
		if (!canvas.current) {
			return;
		}
		setRunning(true);
		try {
			const blob = await canvasBlob(canvas.current);
			downloadBlob(blob, `${slug}-chat.png`);
			notify.success(t("options.downloaded"));
		} catch {
			setError(t("options.failed"));
		} finally {
			setRunning(false);
		}
	};

	const update = (id: string, patch: Partial<Message>) => {
		setMessages((current) =>
			current.map((message) =>
				message.id === id ? { ...message, ...patch } : message,
			),
		);
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
			<div className="flex min-w-0 flex-col gap-4">
				<div className="overflow-hidden rounded-xl border border-border bg-surface-2 p-3">
					<canvas
						aria-label={t("options.preview")}
						className="mx-auto h-auto w-full max-w-sm rounded-lg"
						data-testid="chat-canvas"
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
					<FieldLabel htmlFor="chat-contact">{t("options.contact")}</FieldLabel>
					<FieldControl
						className={inputClass}
						id="chat-contact"
						onChange={(event) => setContact(event.target.value)}
						value={contact}
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
				<div className="flex items-center gap-2">
					<input
						accept=".png,.jpg,.jpeg,.webp"
						className="sr-only"
						onChange={async (event) => {
							const picked = event.target.files?.[0];
							if (!picked) {
								return;
							}
							if (avatarUrl.current) {
								URL.revokeObjectURL(avatarUrl.current);
							}
							avatarUrl.current = URL.createObjectURL(picked);
							try {
								avatar.current = await loadCanvasImage(avatarUrl.current);
								setAvatarName(picked.name);
							} catch {
								setError(t("options.imageError"));
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
						{t("options.avatar")}
					</SmoothButton>
					<span className="min-w-0 flex-1 truncate text-caption text-text-3">
						{avatarName ?? t("options.noAvatar")}
					</span>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className="text-small font-medium">
							{t("options.messages")}
						</span>
						<SmoothButton
							onClick={() =>
								setMessages((current) => [
									...current,
									newMessage("out", "", "09:45"),
								])
							}
							size="sm"
							variant="secondary"
						>
							<Plus aria-hidden="true" className="size-4" />
							{t("options.add")}
						</SmoothButton>
					</div>
					{messages.map((message) => (
						<div
							className="flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-2"
							key={message.id}
						>
							<div className="flex gap-2">
								<Select
									aria-label={t("options.side")}
									className={selectTriggerClass}
									onValueChange={(value) =>
										update(message.id, { side: value as "in" | "out" })
									}
									options={[
										{ label: t("options.incoming"), value: "in" },
										{ label: t("options.outgoing"), value: "out" },
									]}
									value={message.side}
								/>
								<button
									aria-label={t("options.remove")}
									className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-3 outline-none hover:text-error"
									onClick={() =>
										setMessages((current) =>
											current.filter((item) => item.id !== message.id),
										)
									}
									type="button"
								>
									<Trash2 aria-hidden="true" className="size-4" />
								</button>
							</div>
							<textarea
								aria-label={t("options.message")}
								className="min-h-16 w-full resize-y rounded-md border border-border bg-surface p-2 text-small text-text outline-none focus-visible:border-blue-500"
								onChange={(event) =>
									update(message.id, { text: event.target.value })
								}
								rows={2}
								value={message.text}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
