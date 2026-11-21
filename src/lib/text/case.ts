// case conversions, all pure string work.
export type CaseStyle =
	| "upper"
	| "lower"
	| "title"
	| "sentence"
	| "camel"
	| "snake"
	| "kebab";

export const CASE_STYLES: CaseStyle[] = [
	"upper",
	"lower",
	"title",
	"sentence",
	"camel",
	"snake",
	"kebab",
];

function wordsOf(text: string): string[] {
	return text
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean);
}

export function convertCase(text: string, style: CaseStyle): string {
	switch (style) {
		case "upper":
			return text.toUpperCase();
		case "lower":
			return text.toLowerCase();
		case "title":
			return text
				.toLowerCase()
				.replace(/\b[a-z]/g, (char) => char.toUpperCase());
		case "sentence":
			return text
				.toLowerCase()
				.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (match) =>
					match.toUpperCase(),
				);
		case "camel": {
			const words = wordsOf(text);
			return words
				.map((word, index) =>
					index === 0
						? word.toLowerCase()
						: word[0]?.toUpperCase() + word.slice(1).toLowerCase(),
				)
				.join("");
		}
		case "snake":
			return wordsOf(text)
				.map((word) => word.toLowerCase())
				.join("_");
		case "kebab":
			return wordsOf(text)
				.map((word) => word.toLowerCase())
				.join("-");
	}
}
