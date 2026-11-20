// crop selection math in fractions of the image, 0 to 1.

export interface Selection {
	x: number;
	y: number;
	width: number;
	height: number;
}

// orders two drag corners into a normalized box.
export function selectionFromCorners(
	startX: number,
	startY: number,
	endX: number,
	endY: number,
): Selection {
	return {
		x: Math.min(startX, endX),
		y: Math.min(startY, endY),
		width: Math.abs(endX - startX),
		height: Math.abs(endY - startY),
	};
}

// clamps a selection inside the image with a minimum size.
export function clampSelection(
	selection: Selection,
	minimum = 0.02,
): Selection {
	const x = Math.min(1 - minimum, Math.max(0, selection.x));
	const y = Math.min(1 - minimum, Math.max(0, selection.y));
	return {
		x,
		y,
		width: Math.min(1 - x, Math.max(minimum, selection.width)),
		height: Math.min(1 - y, Math.max(minimum, selection.height)),
	};
}

// reshapes a selection to width over height around its center.
export function constrainAspect(
	selection: Selection,
	ratio: number,
): Selection {
	const centerX = selection.x + selection.width / 2;
	const centerY = selection.y + selection.height / 2;
	let width = selection.width;
	let height = width / ratio;
	if (centerY - height / 2 < 0 || centerY + height / 2 > 1) {
		height = selection.height;
		width = height * ratio;
	}
	return clampSelection({
		x: centerX - width / 2,
		y: centerY - height / 2,
		width,
		height,
	});
}

// fractions to whole source pixels.
export function selectionPixels(
	selection: Selection,
	imageWidth: number,
	imageHeight: number,
): { x: number; y: number; width: number; height: number } {
	const x = Math.floor(selection.x * imageWidth);
	const y = Math.floor(selection.y * imageHeight);
	const width = Math.max(1, Math.round(selection.width * imageWidth));
	const height = Math.max(1, Math.round(selection.height * imageHeight));
	return {
		x: Math.min(x, imageWidth - 1),
		y: Math.min(y, imageHeight - 1),
		width: Math.min(width, imageWidth - x),
		height: Math.min(height, imageHeight - y),
	};
}
