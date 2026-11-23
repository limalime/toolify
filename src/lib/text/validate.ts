export interface TextPosition {
	line: number;
	column: number;
	offset: number;
}

export interface JsonCheck {
	ok: boolean;
	message?: string;
	position?: TextPosition;
}

export function positionAt(text: string, offset: number): TextPosition {
	const safe = Math.max(0, Math.min(text.length, offset));
	const before = text.slice(0, safe);
	const lines = before.split("\n");
	return {
		line: lines.length,
		column: (lines.at(-1)?.length ?? 0) + 1,
		offset: safe,
	};
}

// v8 reports json errors as "at position 12" or "at line 3 column 4".
// map both back to a line and column so the ui can point at the spot.
export function jsonErrorOffset(message: string, text: string): number {
	const direct = /position\s+(\d+)/i.exec(message);
	if (direct?.[1]) {
		return Number(direct[1]);
	}
	const lineColumn = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message);
	if (lineColumn?.[1] && lineColumn[2]) {
		const lines = text.split("\n");
		const lineIndex = Math.max(0, Number(lineColumn[1]) - 1);
		let offset = 0;
		for (let index = 0; index < lineIndex && index < lines.length; index += 1) {
			offset += (lines[index]?.length ?? 0) + 1;
		}
		return offset + Math.max(0, Number(lineColumn[2]) - 1);
	}
	return 0;
}

export function validateJson(text: string): JsonCheck {
	if (!text.trim()) {
		return { ok: false, message: "empty" };
	}
	try {
		JSON.parse(text);
		return { ok: true };
	} catch (unknown) {
		const message = unknown instanceof Error ? unknown.message : "invalid json";
		const offset = jsonErrorOffset(message, text);
		return { ok: false, message, position: positionAt(text, offset) };
	}
}

// counts opening and closing tags for html snippets. void elements and
// self closing tags are ignored. it does not try to be a full parser.
const VOID_TAGS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr",
]);

export interface TagBalance {
	ok: boolean;
	unclosed: string[];
	unexpected: string[];
}

export function tagBalance(html: string): TagBalance {
	const stack: string[] = [];
	const unclosed: string[] = [];
	const unexpected: string[] = [];
	const withoutComments = html
		.replaceAll(/<!--[\s\S]*?-->/g, "")
		.replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
	const pattern = /<\/?([a-zA-Z][\w:-]*)(?:\s[^<>]*?)?\s*\/?>/g;
	let match: RegExpExecArray | null = pattern.exec(withoutComments);
	while (match) {
		const raw = match[0];
		const name = (match[1] ?? "").toLowerCase();
		const closing = raw.startsWith("</");
		const selfClosing = raw.endsWith("/>") || VOID_TAGS.has(name);
		if (!closing && !selfClosing) {
			stack.push(name);
		} else if (closing) {
			const last = stack.pop();
			if (last !== name) {
				unexpected.push(name);
				if (last) {
					stack.push(last);
				}
			}
		}
		match = pattern.exec(withoutComments);
	}
	unclosed.push(...stack.reverse());
	return { ok: unclosed.length === 0 && unexpected.length === 0, unclosed, unexpected };
}