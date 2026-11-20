// watermark geometry. positions address a 3 by 3 grid, row major
// from top left (0) to bottom right (8).

export const WATERMARK_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

// top left corner for a mark of given size on a base of given size,
// with a margin that scales with the base.
export function anchorPosition(
	position: WatermarkPosition,
	baseWidth: number,
	baseHeight: number,
	markWidth: number,
	markHeight: number,
): { x: number; y: number } {
	const margin = Math.round(Math.min(baseWidth, baseHeight) * 0.04);
	const column = position % 3;
	const row = Math.floor(position / 3);
	const x =
		column === 0
			? margin
			: column === 1
				? Math.round((baseWidth - markWidth) / 2)
				: baseWidth - markWidth - margin;
	const y =
		row === 0
			? margin
			: row === 1
				? Math.round((baseHeight - markHeight) / 2)
				: baseHeight - markHeight - margin;
	return { x: Math.max(0, x), y: Math.max(0, y) };
}

// scales a mark to at most a fraction of the base width, never upscaling.
export function markScale(
	markWidth: number,
	markHeight: number,
	baseWidth: number,
	maxFraction = 0.4,
): { width: number; height: number } {
	const scale = Math.min(1, (baseWidth * maxFraction) / Math.max(1, markWidth));
	return {
		width: Math.max(1, Math.round(markWidth * scale)),
		height: Math.max(1, Math.round(markHeight * scale)),
	};
}

// rasters text to pixels on the main thread, where document fonts live.
export function rasterizeTextMark(
	text: string,
	fontSize: number,
): { data: ImageData; width: number; height: number } {
	const measure = document.createElement("canvas").getContext("2d");
	if (!measure) {
		throw new Error("canvas unavailable");
	}
	measure.font = `${fontSize}px CalSans, sans-serif`;
	const width = Math.max(
		1,
		Math.ceil(measure.measureText(text).width) + fontSize,
	);
	const height = Math.ceil(fontSize * 1.6);
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("canvas unavailable");
	}
	context.font = `${fontSize}px CalSans, sans-serif`;
	context.textBaseline = "middle";
	context.lineWidth = Math.max(1, Math.round(fontSize / 12));
	context.strokeStyle = "rgba(0, 0, 0, 0.45)";
	context.fillStyle = "#ffffff";
	context.strokeText(text, fontSize / 2, height / 2);
	context.fillText(text, fontSize / 2, height / 2);
	const data = context.getImageData(0, 0, width, height);
	return { data, width, height };
}
