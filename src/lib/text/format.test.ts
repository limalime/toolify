import { describe, expect, it } from "vitest";
import {
	formatJson,
	formatMarkdown,
	formatXml,
	minifyJson,
	minifyMarkdown,
	minifyXml,
} from "./format";

describe("code formatter", () => {
	it("formats and minifies json", () => {
		expect(formatJson('{"b":2,"a":[1,2]}')).toEqual({
			ok: true,
			value: '{\n  "b": 2,\n  "a": [\n    1,\n    2\n  ]\n}\n',
		});
		expect(minifyJson('{ "a" : 1 }')).toEqual({ ok: true, value: '{"a":1}' });
	});

	it("reports json errors with a line number", () => {
		const bad = formatJson('{\n"a": 1,\n"oops"\n}');
		expect(bad).toMatchObject({ ok: false });
		if (!bad.ok) {
			expect(bad.error.code).toBe("json");
			expect(bad.error.line).toBeGreaterThanOrEqual(3);
		}
	});

	it("formats and minifies xml", () => {
		expect(formatXml("<root><a>x</a><b/></root>")).toEqual({
			ok: true,
			value: "<root>\n  <a>\n    x\n  </a>\n  <b/>\n</root>\n",
		});
		expect(minifyXml("<root>\n  <a>x</a>\n</root>")).toEqual({
			ok: true,
			value: "<root><a>x</a></root>",
		});
	});

	it("reports xml errors with a line number", () => {
		const mismatched = formatXml("<root>\n<bad>\n</root>");
		expect(mismatched).toMatchObject({ ok: false });
		if (!mismatched.ok) {
			expect(mismatched.error).toMatchObject({
				code: "mismatch",
				line: 3,
				detail: "root",
			});
		}
		const unclosed = formatXml("<root><a>");
		expect(unclosed).toMatchObject({ ok: false });
		if (!unclosed.ok) {
			expect(unclosed.error).toMatchObject({ code: "unclosed", detail: "a" });
		}
	});

	it("formats markdown with prettier", async () => {
		const result = await formatMarkdown("# Title\n\nSome   spaced   text\n");
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toBe("# Title\n\nSome spaced text\n");
		}
	});

	it("minifies markdown whitespace honestly", () => {
		expect(minifyMarkdown("# t  \n\n\ntext   \n")).toEqual({
			ok: true,
			value: "# t\n\ntext\n",
		});
	});
});
