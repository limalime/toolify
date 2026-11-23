export type PdfQuality = "low" | "medium" | "high";

export const PDF_QUALITY_SCALE: Record<PdfQuality, number> = {
	low: 0.9,
	medium: 1.4,
	high: 2,
};

export const PDF_QUALITY_JPEG: Record<PdfQuality, number> = {
	low: 0.5,
	medium: 0.72,
	high: 0.9,
};

export const MAX_PDF_BYTES = 100 * 1024 * 1024;

export interface SizeVerdict {
	smaller: boolean;
	percent: number;
	label: "smaller" | "larger" | "same";
}

export function sizeVerdict(original: number, output: number): SizeVerdict {
	if (original <= 0 || output <= 0) {
		return { smaller: false, percent: 0, label: "same" };
	}
	const delta = Math.round(((original - output) / original) * 100);
	if (Math.abs(delta) < 1) {
		return { smaller: false, percent: 0, label: "same" };
	}
	return {
		smaller: delta > 0,
		percent: Math.abs(delta),
		label: delta > 0 ? "smaller" : "larger",
	};
}

export function pageSizeAt(scaledWidth: number, scaledHeight: number): {
	width: number;
	height: number;
} {
	return {
		width: Math.max(1, Math.round(scaledWidth)),
		height: Math.max(1, Math.round(scaledHeight)),
	};
}