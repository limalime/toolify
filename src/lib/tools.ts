import type { CategoryKey } from "@/components/layout/categories";

export interface ToolEntry {
	slug: string;
	category: CategoryKey;
	icon: string;
}

// shipping a tool means appending one entry here, registering its icon,
// adding tools.{slug} messages in all seven locales, and shipping its
// page. the registry guard test fails otherwise, so the menu only ever
// lists working tools.
export const TOOLS: ToolEntry[] = [
	{ slug: "image-converter", category: "gambar", icon: "converter" },
	{ slug: "compress-image", category: "gambar", icon: "compress" },
	{ slug: "resize-image", category: "gambar", icon: "resize" },
	{ slug: "crop-image", category: "gambar", icon: "crop" },
	{ slug: "watermark-image", category: "gambar", icon: "watermark" },
	{ slug: "enhance-image", category: "gambar", icon: "enhance" },
	{ slug: "remove-background", category: "gambar", icon: "background" },
	{ slug: "upscale-image", category: "gambar", icon: "upscale" },
	{ slug: "average-color", category: "gambar", icon: "average" },
	{ slug: "image-color-picker", category: "gambar", icon: "eyedrop" },
	{ slug: "image-metadata", category: "gambar", icon: "metadata" },
	{ slug: "meme-generator", category: "gambar", icon: "meme" },
	{ slug: "png-to-svg", category: "gambar", icon: "trace" },
	{ slug: "instagram-generator", category: "gambar", icon: "instagram" },
	{ slug: "x-post-generator", category: "gambar", icon: "xpost" },
	{ slug: "messenger-generator", category: "gambar", icon: "messenger" },
	{ slug: "whatsapp-generator", category: "gambar", icon: "whatsapp" },
	{ slug: "imessage-generator", category: "gambar", icon: "imessage" },
	{ slug: "qr-code-generator", category: "text", icon: "qr" },
	{ slug: "ascii-art", category: "text", icon: "ascii" },
	{ slug: "ascii-fonts", category: "text", icon: "font" },
	{ slug: "barcode-generator", category: "text", icon: "barcode" },
	{ slug: "case-converter", category: "text", icon: "case" },
	{ slug: "word-counter", category: "text", icon: "count" },
	{ slug: "lorem-ipsum", category: "text", icon: "lorem" },
	{ slug: "base64-url-encoder", category: "text", icon: "codec" },
	{ slug: "hash-generator", category: "text", icon: "hash" },
	{ slug: "code-formatter", category: "text", icon: "brace" },
	{ slug: "code-validator", category: "text", icon: "validate" },
	{ slug: "online-ide", category: "text", icon: "code" },
	{ slug: "online-notes", category: "text", icon: "notes" },
	{ slug: "text-encodings", category: "text", icon: "digits" },
	{ slug: "mp4-to-mp3", category: "video", icon: "audio" },
	{ slug: "video-to-gif", category: "video", icon: "gif" },
	{ slug: "video-converter", category: "video", icon: "videofile" },
	{ slug: "compress-video", category: "video", icon: "shrink" },
	{ slug: "crop-video", category: "video", icon: "frame" },
	{ slug: "audio-converter", category: "audio", icon: "disc" },
	{ slug: "adjust-audio", category: "audio", icon: "waveform" },
	{ slug: "join-audio", category: "audio", icon: "playlist" },
	{ slug: "trim-audio", category: "audio", icon: "cut" },
	{ slug: "audio-speed", category: "audio", icon: "gauge" },
	{ slug: "uuid-generator", category: "lainnya", icon: "dna" },
	{ slug: "password-generator", category: "lainnya", icon: "key" },
	{ slug: "mnemonic-generator", category: "lainnya", icon: "wallet" },
	{ slug: "spin-wheel", category: "lainnya", icon: "wheel" },
	{ slug: "currency-converter", category: "finance", icon: "exchange" },
	{ slug: "compound-interest", category: "finance", icon: "growth" },
	{ slug: "loan-calculator", category: "finance", icon: "loan" },
	{ slug: "percentage-calculator", category: "finance", icon: "percent" },
	{ slug: "calculator", category: "finance", icon: "calculator" },
	{ slug: "pdf-merge-split", category: "pdfUtilities", icon: "pdf" },
	{ slug: "pdf-viewer", category: "pdfUtilities", icon: "pdfview" },
	{ slug: "pdf-compressor", category: "pdfUtilities", icon: "pdfshrink" },
	{ slug: "unit-converter", category: "pdfUtilities", icon: "ruler" },
	{ slug: "color-palette", category: "pdfUtilities", icon: "palette" },
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
