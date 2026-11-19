import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOOL_ICONS } from "@/components/landing/tool-icon";
import { TOOLS, type ToolEntry, toolsByCategory } from "./tools";

const REQUIRED_TOOL_KEYS = [
	"name",
	"tagline",
	"title",
	"description",
	"h1",
] as const;

function readMessages(): Record<string, Record<string, unknown>> {
	const dir = join(process.cwd(), "messages");
	const bundles: Record<string, Record<string, unknown>> = {};
	for (const file of readdirSync(dir).filter((name) =>
		name.endsWith(".json"),
	)) {
		bundles[file.slice(0, -".json".length)] = JSON.parse(
			readFileSync(join(dir, file), "utf8"),
		);
	}
	return bundles;
}

describe("tool registry", () => {
	it("groups entries by category in menu order", () => {
		const entries: ToolEntry[] = [
			{ slug: "b-tool", category: "text", icon: "text" },
			{ slug: "a-tool", category: "gambar", icon: "image" },
		];
		const groups = toolsByCategory(entries);
		expect(groups.map((group) => group.category)).toEqual(["gambar", "text"]);
		expect(groups[0]?.tools.map((tool) => tool.slug)).toEqual(["a-tool"]);
	});

	it("skips categories without tools", () => {
		expect(toolsByCategory([])).toEqual([]);
	});

	it("lists only entries with a page, messages, and an icon", () => {
		const bundles = readMessages();
		for (const tool of TOOLS) {
			expect(tool.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
			expect(TOOL_ICONS[tool.icon]).toBeDefined();
			for (const [locale, bundle] of Object.entries(bundles)) {
				const tools = (bundle.tools ?? {}) as Record<
					string,
					Record<string, unknown>
				>;
				const entry = tools[tool.slug];
				expect(entry, `${tool.slug} in ${locale}`).toBeDefined();
				for (const key of REQUIRED_TOOL_KEYS) {
					expect(entry?.[key], `${tool.slug}.${key} in ${locale}`).toBeTruthy();
				}
			}
		}
	});
});
