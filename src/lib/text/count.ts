// live text statistics. words split on whitespace, sentences on
// terminators, reading time at 200 words per minute.
export interface TextCounts {
	characters: number;
	charactersNoSpaces: number;
	words: number;
	sentences: number;
	paragraphs: number;
	readingSeconds: number;
}

export function countText(text: string): TextCounts {
	const characters = [...text].length;
	const charactersNoSpaces = [...text.replace(/\s/g, "")].length;
	const words = text.trim() ? text.trim().split(/\s+/).length : 0;
	const sentences = text.trim()
		? (text.match(/[^.!?]+[.!?]+["”)]?|\S[^.!?]*$/g) ?? []).length
		: 0;
	const paragraphs = text.trim()
		? text
				.split(/\n+/)
				.map((line) => line.trim())
				.filter(Boolean).length
		: 0;
	return {
		characters,
		charactersNoSpaces,
		words,
		sentences,
		paragraphs,
		readingSeconds: Math.round((words / 200) * 60),
	};
}

export function formatReadingTime(totalSeconds: number): string {
	if (totalSeconds < 60) {
		return `${totalSeconds}s`;
	}
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}
