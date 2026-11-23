import { describe, expect, it } from "vitest";
import {
	decodeNote,
	encodeNote,
	htmlToMarkdown,
	htmlToText,
	markdownToHtml,
	MAX_SHARE_HASH,
	sanitizeNoteHtml,
} from "./rich-text";

describe("rich text", () => {
	it("strips scripts, handlers and unsafe urls", () => {
		const clean = sanitizeNoteHtml(
			'<p onclick="x()">Hi<script>alert(1)</script></p><img src=x onerror=y><a href="javascript:alert(1)">bad</a>',
		);
		expect(clean).not.toContain("script");
		expect(clean).not.toContain("onclick");
		expect(clean).not.toContain("onerror");
		expect(clean).not.toContain("javascript:");
		expect(clean).toContain("<p>Hi</p>");
	});

	it("keeps safe alignment and drops other styles", () => {
		const clean = sanitizeNoteHtml(
			'<p style="text-align: center; color: red">mid</p>',
		);
		expect(clean).toContain("text-align: center");
		expect(clean).not.toContain("color");
	});

	it("turns markdown into html and back", () => {
		const html = markdownToHtml(
			"# Title\n\nSome **bold**, *italic*, ==mark== and [link](https://example.com).\n\n- one\n- two\n\n> quote",
		);
		expect(html).toContain("<h1>Title</h1>");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain("<em>italic</em>");
		expect(html).toContain("<mark>mark</mark>");
		expect(html).toContain("<ul>");
		expect(html).toContain("<blockquote>quote</blockquote>");
		const back = htmlToMarkdown(html);
		expect(back).toContain("# Title");
		expect(back).toContain("**bold**");
		expect(back).toContain("==mark==");
		expect(back).toContain("- one");
	});

	it("round trips a shared note and guards bad payloads", () => {
		const token = encodeNote({
			id: "a",
			title: "Plan",
			body: "<p>Ship <strong>today</strong></p>",
			lineHeight: 1.8,
			updatedAt: 1,
		});
		const decoded = decodeNote(token);
		expect(decoded?.title).toBe("Plan");
		expect(decoded?.body).toContain("<strong>today</strong>");
		expect(decoded?.lineHeight).toBe(1.8);
		expect(decodeNote("not-a-note")).toBeNull();
		expect(decodeNote("")).toBeNull();
	});

	it("keeps share tokens under the path guard for normal notes", () => {
		const token = encodeNote({
			id: "a",
			title: "Short",
			body: `<p>${"word ".repeat(200)}</p>`,
			lineHeight: 1.5,
			updatedAt: 1,
		});
		expect(token.length).toBeLessThan(MAX_SHARE_HASH);
	});

	it("returns plain text without markup", () => {
		expect(htmlToText("<p>Hello <strong>there</strong></p>")).toBe(
			"Hello there",
		);
	});
});