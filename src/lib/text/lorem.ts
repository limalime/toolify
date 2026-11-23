const WORDS = [
	"lorem",
	"ipsum",
	"dolor",
	"sit",
	"amet",
	"consectetur",
	"adipiscing",
	"elit",
	"sed",
	"do",
	"eiusmod",
	"tempor",
	"incididunt",
	"ut",
	"labore",
	"et",
	"dolore",
	"magna",
	"aliqua",
	"enim",
	"ad",
	"minim",
	"veniam",
	"quis",
	"nostrud",
	"exercitation",
	"ullamco",
	"laboris",
	"nisi",
	"aliquip",
	"ex",
	"ea",
	"commodo",
	"consequat",
	"duis",
	"aute",
	"irure",
	"in",
	"reprehenderit",
	"voluptate",
	"velit",
	"esse",
	"cillum",
	"eu",
	"fugiat",
	"nulla",
	"pariatur",
	"excepteur",
	"sint",
	"occaecat",
	"cupidatat",
	"non",
	"proident",
	"sunt",
	"culpa",
	"qui",
	"officia",
	"deserunt",
	"mollit",
	"anim",
	"id",
	"est",
	"laborum",
];

const CLASSIC =
	"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

export type RandomSource = () => number;

export function seededRandom(seed: number): RandomSource {
	let state = seed >>> 0;
	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function word(random: RandomSource): string {
	return WORDS[Math.floor(random() * WORDS.length)] ?? WORDS[0];
}

export function loremSentence(random: RandomSource = Math.random): string {
	const count = 8 + Math.floor(random() * 9);
	const words = Array.from({ length: count }, () => word(random));
	const first = words[0] ?? WORDS[0];
	words[0] = first.charAt(0).toUpperCase() + first.slice(1);
	return `${words.join(" ")}.`;
}

export function loremParagraph(
	random: RandomSource = Math.random,
	sentences = 4,
): string {
	return Array.from({ length: Math.max(1, sentences) }, () =>
		loremSentence(random),
	).join(" ");
}

export interface LoremOptions {
	paragraphs: number;
	sentences: number;
	startWithLorem: boolean;
	random?: RandomSource;
}

export function generateLorem({
	paragraphs,
	sentences,
	startWithLorem,
	random = Math.random,
}: LoremOptions): string {
	const count = Math.max(1, Math.min(20, Math.floor(paragraphs)));
	const per = Math.max(1, Math.min(12, Math.floor(sentences)));
	const blocks = Array.from({ length: count }, (_, index) => {
		const body = loremParagraph(random, per);
		if (index === 0 && startWithLorem) {
			return `${CLASSIC} ${body}`;
		}
		return body;
	});
	return blocks.join("\n\n");
}

export function wordCount(text: string): number {
	return text.trim() ? text.trim().split(/\s+/).length : 0;
}