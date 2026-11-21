"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import SmoothButton from "@/components/smoothui/smooth-button";
import Textarea from "@/components/smoothui/textarea";
import { downloadBytes } from "@/lib/images/download";
import {
	deleteNote,
	exportMarkdown,
	listNotes,
	type Note,
	noteTitle,
	saveNote,
} from "@/lib/text/notes";
import { cn } from "@/lib/utils";

export default function OnlineNotesTool() {
	const t = useTranslations("tools.online-notes");
	const [notes, setNotes] = useState<Note[]>([]);
	const [selected, setSelected] = useState<string | null>(null);
	const [body, setBody] = useState("");
	const [saved, setSaved] = useState(false);
	const [confirming, setConfirming] = useState(false);
	const [loaded, setLoaded] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		listNotes()
			.then((stored) => {
				setNotes(stored);
				if (stored[0]) {
					setSelected(stored[0].id);
					setBody(stored[0].body);
				}
			})
			.finally(() => setLoaded(true));
	}, []);

	const persist = async (id: string, next: string) => {
		const note: Note = { id, body: next, updatedAt: Date.now() };
		await saveNote(note);
		setNotes((current) => {
			const rest = current.filter((item) => item.id !== id);
			return [note, ...rest].sort((a, b) => b.updatedAt - a.updatedAt);
		});
		setSaved(true);
	};

	const onType = (value: string) => {
		setBody(value);
		setSaved(false);
		setConfirming(false);
		if (!selected) {
			return;
		}
		if (timer.current) {
			clearTimeout(timer.current);
		}
		const id = selected;
		timer.current = setTimeout(() => persist(id, value), 500);
	};

	const createNote = () => {
		const id =
			globalThis.crypto?.randomUUID?.() ?? `note-${Date.now().toString(36)}`;
		const note: Note = { id, body: "", updatedAt: Date.now() };
		setNotes((current) => [note, ...current]);
		setSelected(id);
		setBody("");
		setSaved(false);
		setConfirming(false);
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
			setSelected(next?.id ?? null);
			setBody(next?.body ?? "");
			return rest;
		});
		setConfirming(false);
	};

	const exportAll = () => {
		if (notes.length === 0) {
			return;
		}
		downloadBytes(
			new TextEncoder().encode(exportMarkdown(notes)).buffer as ArrayBuffer,
			"text/markdown",
			"notes.md",
		);
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
					className="flex flex-col gap-1"
					role="listbox"
					aria-label={t("name")}
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
							onClick={() => {
								setSelected(note.id);
								setBody(note.body);
								setSaved(true);
								setConfirming(false);
							}}
							role="option"
							type="button"
						>
							{noteTitle(note.body)}
						</button>
					))}
				</div>
			</div>
			<div className="flex min-w-0 flex-col gap-3">
				{selected ? (
					<>
						<Textarea
							aria-label={t("name")}
							className="min-h-80 border-border bg-surface-2"
							data-testid="notes-editor"
							onChange={(event) => onType(event.target.value)}
							rows={14}
							value={body}
						/>
						<div className="flex items-center justify-between gap-2">
							<span
								className="text-small text-text-2"
								data-testid="notes-saved"
							>
								{saved ? t("options.saved") : ""}
							</span>
							<SmoothButton onClick={removeNote} size="sm" variant="secondary">
								{confirming ? t("options.confirmDelete") : t("options.delete")}
							</SmoothButton>
						</div>
					</>
				) : (
					<p className="text-small text-text-2">{t("options.emptyHint")}</p>
				)}
			</div>
		</div>
	);
}
