// local notes on indexeddb, never localstorage. the markdown export
// is pure so the file content stays unit tested.
import { del, get, set } from "idb-keyval";
import { htmlToMarkdown } from "./rich-text";

export interface Note {
	id: string;
	title?: string;
	body: string;
	lineHeight?: number;
	updatedAt: number;
}

const INDEX_KEY = "toolify-notes-index";

export function noteTitle(body: string, fallback = "Empty note"): string {
	const first = body
		.split("\n")
		.map((line) => line.replace(/<[^>]+>/g, " ").trim())
		.find(Boolean);
	if (!first) {
		return fallback;
	}
	return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}

export function noteDisplayTitle(note: Note, fallback = "Empty note"): string {
	return (note.title ?? "").trim() || noteTitle(note.body, fallback);
}

export function exportMarkdown(
	notes: Note[],
	fallback = "Empty note",
): string {
	return `${notes
		.map(
			(note) =>
				`# ${noteDisplayTitle(note, fallback)}\n\n${
					note.body.includes("<")
						? htmlToMarkdown(note.body)
						: note.body
				}`,
		)
		.join("\n\n---\n\n")}\n`;
}

function keyOf(id: string): string {
	return `toolify-note:${id}`;
}

export async function listNotes(): Promise<Note[]> {
	const index = ((await get(INDEX_KEY)) ?? []) as string[];
	const notes: Note[] = [];
	for (const id of index) {
		const note = (await get(keyOf(id))) as Note | undefined;
		if (note) {
			notes.push(note);
		}
	}
	return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveNote(note: Note): Promise<void> {
	const index = new Set<string>(((await get(INDEX_KEY)) ?? []) as string[]);
	index.add(note.id);
	await set(keyOf(note.id), note);
	await set(INDEX_KEY, [...index]);
}

export async function deleteNote(id: string): Promise<void> {
	const index = (((await get(INDEX_KEY)) ?? []) as string[]).filter(
		(entry) => entry !== id,
	);
	await del(keyOf(id));
	await set(INDEX_KEY, index);
}