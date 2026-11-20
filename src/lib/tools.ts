import type { CategoryKey } from "@/components/layout/categories";

export interface ToolEntry {
	slug: string;
	category: CategoryKey;
	icon: string;
}

// contract for tool phases: shipping a tool means appending one entry
// here, registering its icon, adding tools.{slug} messages in all seven
// locales, and shipping its page. the registry guard test fails
// otherwise, so the menu only ever lists working tools.
export const TOOLS: ToolEntry[] = [
	{ slug: "image-converter", category: "gambar", icon: "converter" },
	{ slug: "compress-image", category: "gambar", icon: "compress" },
	{ slug: "resize-image", category: "gambar", icon: "resize" },
	{ slug: "crop-image", category: "gambar", icon: "crop" },
	{ slug: "watermark-image", category: "gambar", icon: "watermark" },
];

export const CATEGORY_ORDER: CategoryKey[] = [
	"gambar",
	"text",
	"video",
	"audio",
	"lainnya",
	"finance",
	"pdfUtilities",
];

export const CATEGORY_ANCHORS: Record<CategoryKey, string> = {
	gambar: "gambar",
	text: "text",
	video: "video",
	audio: "audio",
	lainnya: "lainnya",
	finance: "finance",
	pdfUtilities: "pdf-utilities",
};

export function toolsByCategory(entries: ToolEntry[] = TOOLS) {
	return CATEGORY_ORDER.map((category) => ({
		category,
		tools: entries.filter((tool) => tool.category === category),
	})).filter((group) => group.tools.length > 0);
}
