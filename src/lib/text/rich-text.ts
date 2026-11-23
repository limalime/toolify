import type { Note } from "./notes";

const ALLOWED_TAGS = new Set([
	"P",
	"BR",
	"DIV",
	"SPAN",
	"STRONG",
	"B",
	"EM",
	"I",
	"U",
	"S",
	"MARK",
	"A",
	"UL",
	"OL",
	"LI",
	"H1",
	"H2",
	"H3",
	"BLOCKQUOTE",
	"CODE",
	"PRE",
]);

const ALLOWED_STYLES = new Set(["text-align", "line-height"]);

const DROP_TAGS = new Set([
	"SCRIPT",
	"STYLE",
	"IFRAME",
	"OBJECT",
	"EMBED",
	"NOSCRIPT",
	"TEMPLATE",
]);

function cleanElement(element: HTMLElement): void {
	for (const attribute of Array.from(element.attributes)) {
		const name = attribute.name.toLowerCase();
		if (name === "style") {
			const safe: string[] = [];
			for (const part of (element.getAttribute("style") ?? "").split(";")) {
				const [property, ...rest] = part.split(":");
				const key = property?.trim().toLowerCase() ?? "";
				const value = rest.join(":").trim();
				if (key && value && ALLOWED_STYLES.has(key)) {
					safe.push(`${key}: ${value}`);
				}
			}
			if (safe.length > 0) {
				element.setAttribute("style", safe.join("; "));
			} else {
				element.removeAttribute("style");
			}
			continue;
		}
		if (element.tagName === "A" && name === "href") {
			const href = element.getAttribute("href") ?? "";
			if (/^(https?:|mailto:|#|\/)/i.test(href)) {
				element.setAttribute("href", href);
			} else {
				element.removeAttribute("href");
			}
			continue;
		}
		if (element.tagName === "A" && (name === "target" || name === "rel")) {
			continue;
		}
		element.removeAttribute(attribute.name);
	}
	if (element.tagName === "A" && element.getAttribute("href")) {
		element.setAttribute("target", "_blank");
		element.setAttribute("rel", "noopener noreferrer");
	}
	for (const child of Array.from(element.childNodes)) {
		if (child.nodeType === Node.COMMENT_NODE) {
			child.remove();
			continue;
		}
		if (child.nodeType !== Node.ELEMENT_NODE) {
			continue;
		}
		const node = child as HTMLElement;
		if (DROP_TAGS.has(node.tagName)) {
			node.remove();
			continue;
		}
		if (!ALLOWED_TAGS.has(node.tagName)) {
			const moved = Array.from(node.childNodes);
			node.replaceWith(...moved);
			for (const entry of moved) {
				if (entry.nodeType === Node.ELEMENT_NODE) {
					cleanElement(entry as HTMLElement);
				}
			}
			continue;
		}
		cleanElement(node);
	}
}

// strips scripts, event handlers, iframes and unsafe urls. the note body
// is saved and shared as html, so every read goes through this first.
export function sanitizeNoteHtml(html: string): string {
	const doc = new DOMParser().parseFromString(
		`<body>${html}</body>`,
		"text/html",
	);
	cleanElement(doc.body);
	return doc.body.innerHTML;
}

export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function inlineMarkdown(text: string): string {
	let out = escapeHtml(text);
	out = out.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
		'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
	);
	out = out.replace(/==([^=]+)==/g, "<mark>$1</mark>");
	out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
	out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
	return out;
}

// a small markdown subset for notes: headings, lists, quotes, bold,
// italic, highlight, links, inline code and paragraphs.
export function markdownToHtml(markdown: string): string {
	const lines = markdown.replaceAll("\r\n", "\n").split("\n");
	const blocks: string[] = [];
	let paragraph: string[] = [];
	let list: "ul" | "ol" | null = null;
	const flushParagraph = () => {
		if (paragraph.length > 0) {
			blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
			paragraph = [];
		}
	};
	const closeList = () => {
		if (list) {
			blocks.push(`</${list}>`);
			list = null;
		}
	};
	for (const line of lines) {
		const heading = /^(#{1,3})\s+(.+)$/.exec(line);
		const bullet = /^[-*]\s+(.+)$/.exec(line);
		const numbered = /^\d+\.\s+(.+)$/.exec(line);
		if (heading) {
			flushParagraph();
			closeList();
			const level = heading[1]?.length ?? 1;
			blocks.push(`<h${level}>${inlineMarkdown(heading[2] ?? "")}</h${level}>`);
			continue;
		}
		if (bullet || numbered) {
			flushParagraph();
			const next = bullet ? "ul" : "ol";
			if (list !== next) {
				closeList();
				list = next;
				blocks.push(`<${next}>`);
			}
			blocks.push(
				`<li>${inlineMarkdown((bullet ?? numbered)?.[1] ?? "")}</li>`,
			);
			continue;
		}
		if (line.startsWith("> ")) {
			flushParagraph();
			closeList();
			blocks.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
			continue;
		}
		if (line.trim() === "") {
			flushParagraph();
			closeList();
			continue;
		}
		paragraph.push(line.trim());
	}
	flushParagraph();
	closeList();
	return sanitizeNoteHtml(blocks.join(""));
}

function traverse(node: Node, depth = 0): string {
	if (node.nodeType === Node.TEXT_NODE) {
		return node.textContent ?? "";
	}
	if (node.nodeType !== Node.ELEMENT_NODE) {
		return "";
	}
	const element = node as HTMLElement;
	const children = Array.from(element.childNodes)
		.map((child) => traverse(child, depth + 1))
		.join("");
	switch (element.tagName) {
		case "BR":
			return "\n";
		case "P":
		case "DIV":
			return `${children}\n\n`;
		case "H1":
			return `# ${children}\n\n`;
		case "H2":
			return `## ${children}\n\n`;
		case "H3":
			return `### ${children}\n\n`;
		case "STRONG":
		case "B":
			return `**${children}**`;
		case "EM":
		case "I":
			return `*${children}*`;
		case "MARK":
			return `==${children}==`;
		case "CODE":
			return `\`${children}\``;
		case "A":
			return `[${children}](${element.getAttribute("href") ?? ""})`;
		case "LI":
			return `${depth > 0 ? "  " : ""}- ${children.trim()}\n`;
		case "UL":
		case "OL":
			return `${children}\n`;
		case "BLOCKQUOTE":
			return `${children
				.split("\n")
				.filter(Boolean)
				.map((line) => `> ${line}`)
				.join("\n")}\n\n`;
		default:
			return children;
	}
}

export function htmlToMarkdown(html: string): string {
	const doc = new DOMParser().parseFromString(
		`<body>${sanitizeNoteHtml(html)}</body>`,
		"text/html",
	);
	return traverse(doc.body)
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

export function htmlToText(html: string): string {
	const doc = new DOMParser().parseFromString(
		`<body>${sanitizeNoteHtml(html)}</body>`,
		"text/html",
	);
	return (doc.body.textContent ?? "").replace(/\s+\n/g, "\n").trim();
}

function toBase64Url(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
	const padded = value.replaceAll("-", "+").replaceAll("_", "/");
	const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
	const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

export const MAX_SHARE_HASH = 6_000;

export interface SharedNotePayload {
	title: string;
	body: string;
	lineHeight: number;
}

export function encodeNote(note: Note): string {
	const payload: SharedNotePayload = {
		title: note.title ?? "",
		body: sanitizeNoteHtml(note.body),
		lineHeight: note.lineHeight ?? 1.5,
	};
	return toBase64Url(JSON.stringify(payload));
}

export function decodeNote(hash: string): SharedNotePayload | null {
	try {
		const parsed = JSON.parse(fromBase64Url(hash)) as SharedNotePayload;
		if (typeof parsed?.title !== "string" || typeof parsed?.body !== "string") {
			return null;
		}
		return {
			title: parsed.title.slice(0, 200),
			body: sanitizeNoteHtml(parsed.body),
			lineHeight:
				typeof parsed.lineHeight === "number"
					? Math.max(1, Math.min(2.5, parsed.lineHeight))
					: 1.5,
		};
	} catch {
		return null;
	}
}
