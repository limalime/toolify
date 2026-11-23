"use client";

import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Check,
	Code,
	Highlighter,
	Camera,
	Italic,
	Link2,
	List,
	ListOrdered,
	MessageCircle,
	Send,
	Share2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { notify } from "@/components/primitives/notify";
import Field, { FieldControl, FieldLabel } from "@/components/smoothui/field";
import Select from "@/components/smoothui/select";
import Slider from "@/components/smoothui/slider";
import SmoothButton from "@/components/smoothui/smooth-button";
import Toggle from "@/components/smoothui/toggle";
import {
	inputClass,
	selectTriggerClass,
} from "@/lib/control-classes";
import { downloadBytes } from "@/lib/images/download";
import { localizedPath } from "@/lib/locales";
import {
	deleteNote,
	exportMarkdown,
	listNotes,
	type Note,
	noteDisplayTitle,
	saveNote,
} from "@/lib/text/notes";
import {
	encodeNote,
	escapeHtml,
	htmlToMarkdown,
	MAX_SHARE_HASH,
	markdownToHtml,
	sanitizeNoteHtml,
} from "@/lib/text/rich-text";
import { copyText } from "@/lib/text/clipboard";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const TOOL_BUTTON =
	"inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-surface-2 text-text-2 outline-none transition-colors hover:bg-surface-3 hover:text-text focus-visible:border-blue-500 data-pressed:border-blue-500 data-pressed:bg-surface-3 data-pressed:text-text";

const LINE_HEIGHTS = ["1.2", "1.5", "1.8", "2.2"];

function ToolbarButton({
	label,
	icon: Icon,
	onPress,
}: {
	label: string;
	icon: typeof Bold;
	onPress: () => void;
}) {
	return (
		<Toggle
			aria-label={label}
			className={TOOL_BUTTON}
			onPressedChange={onPress}
		>
			<Icon aria-hidden="true" className="size-4" />
		</Toggle>
	);
}

export default function OnlineNotesTool() {
	const t = useTranslations("tools.online-notes");
	const [notes, setNotes] = useState<Note[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [lineHeight, setLineHeight] = useState(1.5);
	const [saved, setSaved] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const [markdown, setMarkdown] = useState(false);
	const [markdownDraft, setMarkdownDraft] = useState("");
	const [linkOpen, setLinkOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const [shareOpen, setShareOpen] = useState(false);
	const [shareUrl, setShareUrl] = useState<string | null>(null);
	const editor = useRef<HTMLDivElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const savedRange = useRef<Range | null>(null);

	const activeNote = notes.find((note) => note.id === selected) ?? null;

	useEffect(() => {
		listNotes()
			.then((stored) => {
				setNotes(stored);
				if (stored[0]) {
					open(stored[0]);
				}
			})
			.finally(() => setLoaded(true));
	}, []);

	function open(note: Note) {
		setSelected(note.id);
		setTitle(note.title ?? "");
		setBody(note.body);
		setLineHeight(note.lineHeight ?? 1.5);
		setMarkdown(false);
		setSaved(true);
		setConfirming(false);
		if (editor.current) {
			editor.current.innerHTML = sanitizeNoteHtml(note.body);
		}
	}

	useEffect(() => {
		if (!markdown && editor.current && editor.current.innerHTML !== body) {
			editor.current.innerHTML = sanitizeNoteHtml(body);
		}
		// body is read when the editor remounts, not on every keystroke
		// biome-ignore lint/correctness/useExhaustiveDependencies: remount sync
	}, [markdown, selected]);

	const persist = (patch: Partial<Note> = {}) => {
		if (!selected) {
			return;
		}
		const note: Note = {
			id: selected,
			title,
			body,
			lineHeight,
			updatedAt: Date.now(),
			...patch,
		};
		saveNote(note).then(() => {
			setNotes((current) => {
				const rest = current.filter((item) => item.id !== selected);
				return [note, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
			});
			setSaved(true);
		});
	};

	const queueSave = (patch: Partial<Note> = {}) => {
		setSaved(false);
		setConfirming(false);
		if (!selected) {
			return;
		}
		if (timer.current) {
			clearTimeout(timer.current);
		}
		timer.current = setTimeout(() => persist(patch), 450);
	};

	const onEdit = () => {
		const html = sanitizeNoteHtml(editor.current?.innerHTML ?? "");
		setBody(html);
		queueSave({ body: html });
	};

	const createNote = () => {
		const id =
			globalThis.crypto?.randomUUID?.() ?? `note-${Date.now().toString(36)}`;
		const note: Note = {
			id,
			title: "",
			body: "",
			lineHeight: 1.5,
			updatedAt: Date.now(),
		};
		setNotes((current) => [note, ...current]);
		open(note);
	};

	const removeNote = async () => {
		if (!selected) {
			return;
		}
		if (!confirming) {
			setConfirming(true);
			return;
		}
		const id = selected;
		await deleteNote(id);
		setNotes((current) => {
			const rest = current.filter((item) => item.id !== id);
			const next = rest[0];
			if (next) {
				open(next);
			} else {
				setSelected(null);
				setTitle("");
				setBody("");
			}
			return rest;
		});
		setConfirming(false);
	};

	const exportAll = () => {
		if (notes.length === 0) {
			return;
		}
		downloadBytes(
			new TextEncoder().encode(exportMarkdown(notes, t("options.emptyNote"))).buffer as ArrayBuffer,
			"text/markdown",
			"notes.md",
		);
	};

	const command = (name: string, value?: string) => {
		editor.current?.focus();
		document.execCommand(name, false, value);
		onEdit();
	};

	const rememberSelection = () => {
		const range = window.getSelection()?.getRangeAt(0);
		if (range && editor.current?.contains(range.commonAncestorContainer)) {
			savedRange.current = range.cloneRange();
		}
	};

	const applyLink = () => {
		const url = linkUrl.trim();
		if (!url) {
			setLinkOpen(false);
			return;
		}
		const safe = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
		editor.current?.focus();
		const range = savedRange.current;
		if (range) {
			const selection = window.getSelection();
			selection?.removeAllRanges();
			selection?.addRange(range);
		}
		if (window.getSelection()?.isCollapsed) {
			document.execCommand("insertHTML", false, `<a href="${escapeHtml(safe)}">${escapeHtml(safe)}</a>`);
		} else {
			document.execCommand("createLink", false, safe);
			const anchor = window.getSelection()?.anchorNode?.parentElement?.closest("a");
			anchor?.setAttribute("target", "_blank");
			anchor?.setAttribute("rel", "noopener noreferrer");
		}
		setLinkOpen(false);
		setLinkUrl("");
		onEdit();
	};

	const switchMarkdown = () => {
		if (!markdown) {
			setMarkdownDraft(htmlToMarkdown(body));
			setMarkdown(true);
			return;
		}
		const html = sanitizeNoteHtml(markdownToHtml(markdownDraft));
		setBody(html);
		setMarkdown(false);
		if (editor.current) {
			editor.current.innerHTML = html;
		}
		queueSave({ body: html });
	};

	const share = () => {
		if (!activeNote) {
			return;
		}
		const token = encodeNote({
			...activeNote,
			title,
			body,
			lineHeight,
			updatedAt: Date.now(),
		});
		if (token.length > MAX_SHARE_HASH) {
			setShareUrl(null);
			setShareOpen(true);
			return;
		}
		setShareUrl(
			`${SITE_URL}${localizedPath(`/online-notes/${token}`, "en")}`,
		);
		setShareOpen(true);
	};

	const shareText = () =>
		noteDisplayTitle(
			{ id: "x", body, title, updatedAt: 0 },
			t("options.emptyNote"),
		);

	const copyShare = async () => {
		if (!shareUrl) {
			return;
		}
		if (await copyText(shareUrl)) {
			notify.success(t("options.linkCopied"));
		} else {
			notify.error(t("options.shareTooLong"));
		}
	};

	const copyInstagram = async () => {
		const text =
			`${noteDisplayTitle({ id: "x", body, title, updatedAt: 0 }, t("options.emptyNote"))}\n\n${shareUrl ?? ""}`.trim();
		if (await copyText(text)) {
			notify.success(t("options.copiedForInstagram"));
			window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
		}
	};

	return (
		<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
			<div className="flex h-fit flex-col gap-3 rounded-lg border border-border bg-surface p-4">
				<div className="flex gap-2">
					<SmoothButton className="w-full" onClick={createNote} size="sm">
						{t("options.new")}
					</SmoothButton>
					<SmoothButton
						className="w-full"
						disabled={notes.length === 0}
						onClick={exportAll}
						size="sm"
						variant="secondary"
					>
						{t("options.export")}
					</SmoothButton>
				</div>
				{loaded && notes.length === 0 ? (
					<p className="text-small text-text-2">{t("options.emptyHint")}</p>
				) : null}
				<div
					aria-label={t("name")}
					className="flex flex-col gap-1"
					role="listbox"
				>
					{notes.map((note) => (
						<button
							aria-selected={note.id === selected}
							className={cn(
								"min-h-11 cursor-pointer truncate rounded-lg border px-3 py-2 text-start text-small outline-none transition-colors focus-visible:border-blue-500",
								note.id === selected
									? "border-blue-500 shadow-glow"
									: "border-border bg-surface-2 hover:text-text",
							)}
							data-testid={`note-${note.id}`}
							key={note.id}
							onClick={() => open(note)}
							role="option"
							type="button"
						>
							{noteDisplayTitle(note, t("options.emptyNote"))}
						</button>
					))}
				</div>
			</div>

			<div className="flex min-w-0 flex-col gap-3">
				{selected ? (
					<>
						<Field>
							<FieldLabel htmlFor="note-title">
								{t("options.title")}
							</FieldLabel>
							<FieldControl
								autoComplete="off"
								className={inputClass}
								id="note-title"
								onChange={(event) => {
									setTitle(event.target.value);
									queueSave({ title: event.target.value });
								}}
								placeholder={t("options.titlePlaceholder")}
								value={title}
							/>
						</Field>

						<div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-2">
							<ToolbarButton
								icon={Bold}
								label={t("options.bold")}
								onPress={() => command("bold")}
							/>
							<ToolbarButton
								icon={Italic}
								label={t("options.italic")}
								onPress={() => command("italic")}
							/>
							<ToolbarButton
								icon={Highlighter}
								label={t("options.highlight")}
								onPress={() => command("hiliteColor", "#fde047")}
							/>
							<ToolbarButton
								icon={List}
								label={t("options.bullets")}
								onPress={() => command("insertUnorderedList")}
							/>
							<ToolbarButton
								icon={ListOrdered}
								label={t("options.numbers")}
								onPress={() => command("insertOrderedList")}
							/>
							<ToolbarButton
								icon={AlignLeft}
								label={t("options.alignStart")}
								onPress={() => command("justifyLeft")}
							/>
							<ToolbarButton
								icon={AlignCenter}
								label={t("options.alignCenter")}
								onPress={() => command("justifyCenter")}
							/>
							<ToolbarButton
								icon={AlignRight}
								label={t("options.alignEnd")}
								onPress={() => command("justifyRight")}
							/>
							<ToolbarButton
								icon={Link2}
								label={t("options.link")}
								onPress={() => {
									rememberSelection();
									setLinkOpen((current) => !current);
								}}
							/>
							<div className="mx-1 h-6 w-px bg-border" />
							<Toggle
								aria-label={t("options.markdown")}
								className={cn(TOOL_BUTTON, "w-auto gap-2 px-2")}
								onPressedChange={switchMarkdown}
								pressed={markdown}
							>
								<Code aria-hidden="true" className="size-4" />
								<span className="text-caption">MD</span>
							</Toggle>
						</div>

						{linkOpen ? (
							<div className="flex gap-2">
								<FieldControl
									aria-label={t("options.linkUrl")}
									className={inputClass}
									onChange={(event) => setLinkUrl(event.target.value)}
									placeholder="https://example.com"
									value={linkUrl}
								/>
								<SmoothButton onClick={applyLink} size="sm">
									{t("options.applyLink")}
								</SmoothButton>
							</div>
						) : null}

						{markdown ? (
							<textarea
								aria-label={t("options.markdown")}
								className={cn(inputClass, "min-h-80 resize-y font-mono")}
								data-testid="notes-markdown"
								dir="ltr"
								onChange={(event) => setMarkdownDraft(event.target.value)}
								rows={14}
								value={markdownDraft}
							/>
						) : (
							<div
								aria-label={t("options.editor")}
								className="notes-editor min-h-80 rounded-lg border border-border bg-surface-2 p-4 text-body text-text outline-none focus-visible:border-blue-500"
								contentEditable
								data-testid="notes-editor"
								onBlur={onEdit}
								onInput={onEdit}
								ref={editor}
								role="textbox"
								style={{ lineHeight }}
								suppressContentEditableWarning
								tabIndex={0}
							/>
						)}

						<div className="grid gap-3 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between gap-2">
									<span className="text-small font-medium">
										{t("options.spacing")}
									</span>
									<output className="text-small tabular-nums text-text-2">
										{lineHeight}
									</output>
								</div>
								<Slider
									aria-label={t("options.spacing")}
									max={220}
									min={120}
									onValueChange={(value) => {
										const next = value / 100;
										setLineHeight(next);
										queueSave({ lineHeight: next });
									}}
									value={Math.round(lineHeight * 100)}
								/>
							</div>
							<Field>
								<FieldLabel htmlFor="note-spacing">
									{t("options.presets")}
								</FieldLabel>
								<Select
									aria-label={t("options.presets")}
									className={selectTriggerClass}
									onValueChange={(value) => {
										const next = Number(value);
										setLineHeight(next);
										queueSave({ lineHeight: next });
									}}
									options={LINE_HEIGHTS.map((value) => ({
										label: value,
										value,
									}))}
									value={String(lineHeight)}
								/>
							</Field>
						</div>

						<div className="flex flex-wrap items-center justify-between gap-2">
							<span
								className="text-small text-text-2"
								data-testid="notes-saved"
							>
								{saved ? t("options.saved") : t("options.saving")}
							</span>
							<div className="flex gap-2">
								<SmoothButton
									disabled={!activeNote}
									onClick={share}
									size="sm"
									variant="secondary"
								>
									<Share2 aria-hidden="true" className="size-4" />
									{t("options.share")}
								</SmoothButton>
								<SmoothButton
									onClick={removeNote}
									size="sm"
									variant="secondary"
								>
									{confirming
										? t("options.confirmDelete")
										: t("options.delete")}
								</SmoothButton>
							</div>
						</div>

						{shareOpen ? (
							<div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
								{shareUrl ? (
									<>
										<p className="text-small text-text-2">
											{t("options.shareReady")}
										</p>
										<input
											aria-label={t("options.shareLink")}
											className={inputClass}
											onFocus={(event) => event.target.select()}
											readOnly
											value={shareUrl}
										/>
										<div className="flex flex-wrap gap-2">
											<SmoothButton
												onClick={copyShare}
												size="sm"
												variant="secondary"
											>
												<Check aria-hidden="true" className="size-4" />
												{t("options.copyLink")}
											</SmoothButton>
											<a
												className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-small text-text outline-none hover:bg-surface-3"
												href={`https://wa.me/?text=${encodeURIComponent(`${shareText()}\n${shareUrl}`)}`}
												rel="noopener noreferrer"
												target="_blank"
											>
												<MessageCircle aria-hidden="true" className="size-4" />
												WhatsApp
											</a>
											<a
												className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-small text-text outline-none hover:bg-surface-3"
												href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(shareUrl)}`}
												rel="noopener noreferrer"
												target="_blank"
											>
												<Send aria-hidden="true" className="size-4" />X
											</a>
											<button
												className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-2 px-3 text-small text-text outline-none hover:bg-surface-3"
												onClick={copyInstagram}
												type="button"
											>
												<Camera aria-hidden="true" className="size-4" />
												Instagram
											</button>
										</div>
									</>
								) : (
									<p className="text-small text-warn">
										{t("options.shareTooLong")}
									</p>
								)}
							</div>
						) : null}
					</>
				) : (
					<p className="hidden text-small text-text-2 lg:block">
						{t("options.emptyHint")}
					</p>
				)}
			</div>
		</div>
	);
}