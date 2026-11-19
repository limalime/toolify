import { getMessages, getTranslations } from "next-intl/server";
import type { MenuTool } from "@/components/landing/tool-menu";
import { TOOLS } from "@/lib/tools";

type ToolMessages = Record<string, { name: string; tagline: string }>;

// resolves the registry into translated menu entries. shared by the
// landing page and the 404 page so both search the same tools.
export async function resolveMenuTools(): Promise<MenuTool[]> {
	const tc = await getTranslations("categories");
	const messages = await getMessages();
	const toolMessages = ((messages as Record<string, unknown>).tools ??
		{}) as ToolMessages;
	return TOOLS.map((tool) => ({
		...tool,
		name: toolMessages[tool.slug]?.name ?? tool.slug,
		tagline: toolMessages[tool.slug]?.tagline ?? "",
		categoryLabel: tc(tool.category),
	}));
}
