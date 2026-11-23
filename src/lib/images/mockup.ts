export function roundRect(
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
): void {
	const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
	context.beginPath();
	context.moveTo(x + r, y);
	context.lineTo(x + width - r, y);
	context.quadraticCurveTo(x + width, y, x + width, y + r);
	context.lineTo(x + width, y + height - r);
	context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	context.lineTo(x + r, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - r);
	context.lineTo(x, y + r);
	context.quadraticCurveTo(x, y, x + r, y);
	context.closePath();
}

export function wrapLines(
	text: string,
	maxWidth: number,
	measure: (value: string) => number,
): string[] {
	const paragraphs = text.replaceAll("\r\n", "\n").split("\n");
	const lines: string[] = [];
	for (const paragraph of paragraphs) {
		const words = paragraph.split(/\s+/).filter(Boolean);
		if (words.length === 0) {
			lines.push("");
			continue;
		}
		let line = "";
		for (const word of words) {
			const next = line ? `${line} ${word}` : word;
			if (measure(next) <= maxWidth || !line) {
				line = next;
			} else {
				lines.push(line);
				line = word;
			}
		}
		if (line) {
			lines.push(line);
		}
	}
	return lines;
}

export function drawParagraph(
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	text: string,
	options: {
		x: number;
		y: number;
		maxWidth: number;
		lineHeight: number;
		align?: CanvasTextAlign;
	},
): number {
	const lines = wrapLines(text, options.maxWidth, (value) =>
		context.measureText(value).width,
	);
	// the mockups are fixed app screenshots, so start means left even when
	// the page around them runs right to left.
	context.direction = "ltr";
	context.textAlign = options.align ?? "start";
	let y = options.y;
	for (const line of lines) {
		context.fillText(line, options.x, y);
		y += options.lineHeight;
	}
	return y;
}

export function formatCount(value: number): string {
	if (!Number.isFinite(value) || value < 0) {
		return "0";
	}
	if (value >= 1_000_000) {
		return `${Number((value / 1_000_000).toFixed(1))}M`;
	}
	if (value >= 1_000) {
		return `${Number((value / 1_000).toFixed(1))}K`;
	}
	return String(Math.floor(value));
}

export function drawCover(
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	image: CanvasImageSource & { width: number; height: number },
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	const scale = Math.max(width / image.width, height / image.height);
	const sourceWidth = width / scale;
	const sourceHeight = height / scale;
	context.drawImage(
		image,
		(image.width - sourceWidth) / 2,
		(image.height - sourceHeight) / 2,
		sourceWidth,
		sourceHeight,
		x,
		y,
		width,
		height,
	);
}

export function drawAvatar(
	context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
	image: CanvasImageSource & { width: number; height: number } | null,
	x: number,
	y: number,
	size: number,
	fallback: string,
): void {
	context.save();
	context.beginPath();
	context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	context.clip();
	if (image) {
		const scale = Math.max(size / image.width, size / image.height);
		const sourceWidth = size / scale;
		const sourceHeight = size / scale;
		context.drawImage(
			image,
			(image.width - sourceWidth) / 2,
			(image.height - sourceHeight) / 2,
			sourceWidth,
			sourceHeight,
			x,
			y,
			size,
			size,
		);
	} else {
		context.fillStyle = "#1b56fd";
		context.fillRect(x, y, size, size);
		context.fillStyle = "#ffffff";
		context.font = `600 ${size * 0.4}px system-ui, sans-serif`;
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.fillText(fallback.slice(0, 1).toUpperCase(), x + size / 2, y + size / 2);
	}
	context.restore();
}

export function formatClock(date: Date): string {
	return `${String(date.getHours()).padStart(2, "0")}:${String(
		date.getMinutes(),
	).padStart(2, "0")}`;
}

export function mockTimestamp(): string {
	const now = new Date();
	return new Intl.DateTimeFormat("en", {
		hour: "numeric",
		minute: "2-digit",
	}).format(now);
}

export const MOCKUP_FONTS = {
	sans: "system-ui, -apple-system, Segoe UI, sans-serif",
	display: "CalSans, system-ui, sans-serif",
	mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export function loadCanvasImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new window.Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("image"));
		image.src = src;
	});
}

export function canvasBlob(
	canvas: HTMLCanvasElement,
	type = "image/png",
	quality = 0.92,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("blob"));
				}
			},
			type,
			quality,
		);
	});
}