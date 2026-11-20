import type { OutputFormat } from "@/workers/image-worker";

// hard input caps, enforced with a plain error before any heavy work.
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 64 * 1024 * 1024;

export const OUTPUT_FORMATS: OutputFormat[] = [
	"png",
	"jpg",
	"webp",
	"avif",
	"ico",
	"pdf",
	"svg",
];

export const OUTPUT_META: Record<
	OutputFormat,
	{ extension: string; mime: string; label: string }
> = {
	png: { extension: "png", mime: "image/png", label: "PNG" },
	jpg: { extension: "jpg", mime: "image/jpeg", label: "JPG" },
	webp: { extension: "webp", mime: "image/webp", label: "WEBP" },
	avif: { extension: "avif", mime: "image/avif", label: "AVIF" },
	ico: { extension: "ico", mime: "image/x-icon", label: "ICO" },
	pdf: { extension: "pdf", mime: "application/pdf", label: "PDF" },
	svg: { extension: "svg", mime: "image/svg+xml", label: "SVG" },
};

// formats that cannot hold transparency get the background composite.
const OPAQUE_OUTPUTS: OutputFormat[] = ["jpg", "ico", "pdf", "svg"];

export function needsBackground(format: OutputFormat): boolean {
	return OPAQUE_OUTPUTS.includes(format);
}

// lossy encoders honor the quality slider, lossless ones ignore it.
export function usesQuality(format: OutputFormat): boolean {
	return format === "jpg" || format === "webp" || format === "avif";
}

export const CONVERTER_ACCEPT =
	".png,.jpg,.jpeg,.webp,.avif,.ico,.pdf,.svg,.heic,.heif,.ai";

export const RASTER_ACCEPT = ".png,.jpg,.jpeg,.webp,.avif";

export function stemOf(filename: string): string {
	const dot = filename.lastIndexOf(".");
	return (dot > 0 ? filename.slice(0, dot) : filename).trim() || "image";
}
