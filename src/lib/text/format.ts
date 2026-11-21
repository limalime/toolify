// json, xml, and markdown formatting with plain-language errors that
// always name a line number.
export type FormatErrorCode =
	| "json"
	| "empty"
	| "mismatch"
	| "unclosed"
	| "markdown";

export interface FormatError {
	code: FormatErrorCode;
	line: number;
	detail: string;
}

export type FormatResult =
	| { ok: true; value: string }
	| { ok: false; error: FormatError };

export function formatJson(text: string): FormatResult {
	try {
		return {
			ok: true,
			value: `${JSON.stringify(JSON.parse(text), null, 2)}\n`,
		};
	} catch (unknown) {
		return { ok: false, error: jsonError(text, unknown) };
	}
}

export function minifyJson(text: string): FormatResult {
	try {
		return { ok: true, value: JSON.stringify(JSON.parse(text)) };
	} catch (unknown) {
		return { ok: false, error: jsonError(text, unknown) };
	}
}

function lineOf(text: string, offset: number): number {
	return text.slice(0, Math.max(0, offset)).split("\n").length;
}

function jsonError(text: string, unknown: unknown): FormatError {
	const raw = unknown instanceof Error ? unknown.message : "invalid json";
	const at = raw.match(/[Pp]osition (\d+)/);
	if (at?.[1]) {
		return { code: "json", line: lineOf(text, Number(at[1])), detail: "" };
	}
	const lineMatch = raw.match(/[Ll]ine (\d+)/);
	if (lineMatch?.[1]) {
		return { code: "json", line: Number(lineMatch[1]), detail: "" };
	}
	return { code: "json", line: 1, detail: "" };
}

interface XmlToken {
	kind: "open" | "close" | "single" | "text" | "raw";
	name: string;
	body: string;
	line: number;
}

function tokenizeXml(text: string): XmlToken[] {
	const tokens: XmlToken[] = [];
	const pattern =
		/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\?[\s\S]*?\?>|<\/[^>]+>|<[^>]+\/?>/g;
	let last = 0;
	let match: RegExpExecArray | null = pattern.exec(text);
	const pushText = (slice: string, offset: number) => {
		if (slice.trim()) {
			tokens.push({
				kind: "text",
				name: "",
				body: slice.trim(),
				line: lineOf(text, offset),
			});
		}
	};
	while (match !== null) {
		pushText(text.slice(last, match.index), last);
		const body = match[0];
		const line = lineOf(text, match.index);
		if (body.startsWith("</")) {
			tokens.push({
				kind: "close",
				name: body.slice(2, -1).trim(),
				body,
				line,
			});
		} else if (
			body.startsWith("<!--") ||
			body.startsWith("<![CDATA[") ||
			body.startsWith("<!DOCTYPE") ||
			body.startsWith("<?")
		) {
			tokens.push({ kind: "raw", name: "", body, line });
		} else if (body.endsWith("/>")) {
			tokens.push({
				kind: "single",
				name: body.slice(1, -2).trim().split(/\s/, 1)[0] ?? "",
				body,
				line,
			});
		} else {
			tokens.push({
				kind: "open",
				name: body.slice(1, -1).trim().split(/\s/, 1)[0] ?? "",
				body,
				line,
			});
		}
		last = match.index + body.length;
		match = pattern.exec(text);
	}
	pushText(text.slice(last), last);
	return tokens;
}

export function formatXml(text: string): FormatResult {
	if (!text.trim()) {
		return { ok: false, error: { code: "empty", line: 1, detail: "" } };
	}
	const lines: string[] = [];
	const stack: Array<{ name: string; line: number }> = [];
	for (const token of tokenizeXml(text)) {
		if (token.kind === "close") {
			const open = stack.pop();
			if (!open || open.name !== token.name) {
				return {
					ok: false,
					error: { code: "mismatch", line: token.line, detail: token.name },
				};
			}
			lines.push(`${"  ".repeat(stack.length)}${token.body}`);
		} else if (token.kind === "open") {
			lines.push(`${"  ".repeat(stack.length)}${token.body}`);
			stack.push({ name: token.name, line: token.line });
		} else if (token.kind === "single" || token.kind === "raw") {
			lines.push(`${"  ".repeat(stack.length)}${token.body}`);
		} else {
			lines.push(`${"  ".repeat(stack.length)}${token.body}`);
		}
	}
	if (stack.length > 0) {
		const open = stack[stack.length - 1] as { name: string; line: number };
		return {
			ok: false,
			error: { code: "unclosed", line: open.line, detail: open.name },
		};
	}
	return { ok: true, value: `${lines.join("\n")}\n` };
}

export function minifyXml(text: string): FormatResult {
	const formatted = formatXml(text);
	if (!formatted.ok) {
		return formatted;
	}
	return {
		ok: true,
		value: formatted.value
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean)
			.join(""),
	};
}

export async function formatMarkdown(text: string): Promise<FormatResult> {
	try {
		const prettier = await import("prettier/standalone");
		const markdown = await import("prettier/plugins/markdown");
		const value = await prettier.format(text, {
			parser: "markdown",
			plugins: [markdown],
		});
		return { ok: true, value };
	} catch {
		return { ok: false, error: { code: "markdown", line: 1, detail: "" } };
	}
}

export function minifyMarkdown(text: string): FormatResult {
	const value = text
		.split("\n")
		.map((line) => line.replace(/[ \t]+$/g, ""))
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
	return { ok: true, value: `${value}\n` };
}
