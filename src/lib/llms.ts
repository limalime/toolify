import enMessages from "../../messages/en.json";
import { LOCALES, localizedPath } from "./locales";
import { absoluteUrl, SITE_NAME } from "./site";
import { allSitePaths } from "./site-routes";
import { TOOLS } from "./tools";

export interface LlmsToolEntry {
	slug: string;
	name: string;
}

// machine readable site map. pages always listed, tools only once
// shipped tools exist, so the file never advertises vapor.
export function buildLlmsTxt(tools: LlmsToolEntry[] = currentTools()): string {
	const lines = [
		`# ${SITE_NAME}`,
		"",
		"> Free online tools that run fully in the browser. Files never leave the device.",
		"",
		"## Pages",
		...allSitePaths()
			.filter((path) => !TOOLS.some((tool) => path === `/${tool.slug}`))
			.map((path) => {
				const label =
					path === "/"
						? "Home"
						: path.slice(1, 2).toUpperCase() + path.slice(2);
				return `- [${label}](${absoluteUrl(path)})`;
			}),
		"",
	];
	if (tools.length > 0) {
		lines.push("## Tools", "");
		for (const tool of tools) {
			lines.push(`### ${tool.name}`);
			for (const locale of LOCALES) {
				lines.push(
					`- ${absoluteUrl(localizedPath(`/${tool.slug}`, locale.code))}`,
				);
			}
			lines.push("");
		}
	}
	return `${lines.join("\n").trimEnd()}\n`;
}

function currentTools(): LlmsToolEntry[] {
	const tools =
		(enMessages as { tools?: Record<string, { name?: string }> }).tools ?? {};
	return TOOLS.map((tool) => ({
		slug: tool.slug,
		name: tools[tool.slug]?.name ?? tool.slug,
	}));
}
