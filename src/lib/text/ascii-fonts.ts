// fancy unicode styles by code point arithmetic plus small explicit
// maps for the blocks with holes. unmapped characters pass through.
export type AsciiFontStyle =
	| "bold"
	| "italic"
	| "boldItalic"
	| "monospace"
	| "script"
	| "boldScript"
	| "doubleStruck"
	| "circled"
	| "fullwidth"
	| "smallCaps";

export const ASCII_FONT_STYLES: AsciiFontStyle[] = [
	"bold",
	"italic",
	"boldItalic",
	"monospace",
	"script",
	"boldScript",
	"doubleStruck",
	"circled",
	"fullwidth",
	"smallCaps",
];

interface Block {
	upper: number;
	lower: number;
	digit: number;
}

const BLOCKS: Record<Exclude<AsciiFontStyle, "script" | "smallCaps">, Block> = {
	bold: { upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
	italic: { upper: 0x1d434, lower: 0x1d44e, digit: -1 },
	boldItalic: { upper: 0x1d468, lower: 0x1d482, digit: -1 },
	monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
	boldScript: { upper: 0x1d4d0, lower: 0x1d4ea, digit: -1 },
	doubleStruck: { upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8 },
	circled: { upper: 0x24b6, lower: 0x24d0, digit: 0x24ea },
	fullwidth: { upper: 0xff21, lower: 0xff41, digit: 0xff10 },
};

// mathematical script has reserved holes, map only what exists.
const SCRIPT_UPPER: Record<string, string> = {
	A: "𝒜",
	B: "ℬ",
	C: "𝒞",
	D: "𝒟",
	E: "ℰ",
	F: "ℱ",
	G: "𝒢",
	H: "ℋ",
	I: "ℐ",
	J: "𝒥",
	K: "𝒦",
	L: "ℒ",
	M: "ℳ",
	N: "𝒩",
	O: "𝒪",
	P: "𝒫",
	Q: "𝒬",
	R: "ℛ",
	S: "𝒮",
	T: "𝒯",
	U: "𝒰",
	V: "𝒱",
	W: "𝒲",
	X: "𝒳",
	Y: "𝒴",
	Z: "𝒵",
};
const SCRIPT_LOWER_BASE = 0x1d4b6;

const SCRIPT_LOWER_HOLES = new Set(["e", "g", "o"]);
const SCRIPT_LOWER_FIX: Record<string, string> = {
	e: "ℯ",
	g: "ℊ",
	o: "ℴ",
};

const SMALL_CAPS: Record<string, string> = {
	a: "ᴀ",
	b: "ʙ",
	c: "ᴄ",
	d: "ᴅ",
	e: "ᴇ",
	f: "ꜰ",
	g: "ɢ",
	h: "ʜ",
	i: "ɪ",
	j: "ᴊ",
	k: "ᴋ",
	l: "ʟ",
	m: "ᴍ",
	n: "ɴ",
	o: "ᴏ",
	p: "ᴘ",
	q: "ǫ",
	r: "ʀ",
	s: "ꜱ",
	t: "ᴛ",
	u: "ᴜ",
	v: "ᴠ",
	w: "ᴡ",
	x: "x",
	y: "ʏ",
	z: "ᴢ",
};

const CIRCLED_DIGITS = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

// blocks with famous holes get their standard stand-ins.
const DOUBLE_STRUCK_UPPER_FIX: Record<string, string> = {
	C: "ℂ",
	H: "ℍ",
	N: "ℕ",
	P: "ℙ",
	Q: "ℚ",
	R: "ℝ",
	Z: "ℤ",
};

function shift(code: number, from: number, to: number): string {
	if (to < 0) {
		return String.fromCodePoint(code);
	}
	return String.fromCodePoint(to + (code - from));
}

export function convertAsciiFont(text: string, style: AsciiFontStyle): string {
	let out = "";
	for (const char of text) {
		const code = char.codePointAt(0) ?? 0;
		if (style === "script") {
			if (code >= 65 && code <= 90) {
				out += SCRIPT_UPPER[char] ?? char;
			} else if (code >= 97 && code <= 122) {
				out += SCRIPT_LOWER_HOLES.has(char)
					? (SCRIPT_LOWER_FIX[char] as string)
					: String.fromCodePoint(SCRIPT_LOWER_BASE + (code - 97));
			} else {
				out += char;
			}
			continue;
		}
		if (style === "smallCaps") {
			out += code >= 97 && code <= 122 ? (SMALL_CAPS[char] ?? char) : char;
			continue;
		}
		if (style === "circled" && code >= 48 && code <= 57) {
			out += CIRCLED_DIGITS[code - 48];
			continue;
		}
		if (style === "doubleStruck" && DOUBLE_STRUCK_UPPER_FIX[char]) {
			out += DOUBLE_STRUCK_UPPER_FIX[char];
			continue;
		}
		if (style === "italic" && char === "h") {
			out += "ℎ";
			continue;
		}
		const block = BLOCKS[style];
		if (code >= 65 && code <= 90) {
			out += shift(code, 65, block.upper);
		} else if (code >= 97 && code <= 122) {
			out += shift(code, 97, block.lower);
		} else if (code >= 48 && code <= 57) {
			out += shift(code, 48, block.digit);
		} else {
			out += char;
		}
	}
	return out;
}
