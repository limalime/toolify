// tool categories for the navbar. hrefs point at landing anchors,
// the menu that owns them lands with the landing page.
export const CATEGORIES = [
	{ href: "/#gambar", key: "gambar" },
	{ href: "/#text", key: "text" },
	{ href: "/#video", key: "video" },
	{ href: "/#audio", key: "audio" },
	{ href: "/#lainnya", key: "lainnya" },
	{ href: "/#finance", key: "finance" },
	{ href: "/#pdf-utilities", key: "pdfUtilities" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
