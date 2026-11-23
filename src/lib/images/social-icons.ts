export type Ink = string;

export function heart(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	filled: boolean,
	ink: Ink,
): void {
	context.save();
	context.translate(x, y);
	context.scale(size / 24, size / 24);
	context.beginPath();
	context.moveTo(12, 21);
	context.bezierCurveTo(4, 14, 1, 10, 1, 6.5);
	context.bezierCurveTo(1, 3, 3.5, 1, 6.5, 1);
	context.bezierCurveTo(9, 1, 11, 2.5, 12, 4.5);
	context.bezierCurveTo(13, 2.5, 15, 1, 17.5, 1);
	context.bezierCurveTo(20.5, 1, 23, 3, 23, 6.5);
	context.bezierCurveTo(23, 10, 20, 14, 12, 21);
	context.closePath();
	if (filled) {
		context.fillStyle = ink;
		context.fill();
	} else {
		context.strokeStyle = ink;
		context.lineWidth = 2.2;
		context.stroke();
	}
	context.restore();
}

function strokeScale(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	draw: () => void,
): void {
	context.save();
	context.translate(x, y);
	context.scale(size / 24, size / 24);
	context.lineWidth = 1.8;
	context.lineCap = "round";
	context.lineJoin = "round";
	draw();
	context.restore();
}

export function commentIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(21, 11.5);
		context.bezierCurveTo(21, 15.6, 17, 18.9, 12, 18.9);
		context.bezierCurveTo(10.7, 18.9, 9.4, 18.7, 8.3, 18.3);
		context.lineTo(3, 20);
		context.lineTo(4.6, 15.4);
		context.bezierCurveTo(3.6, 14.3, 3, 12.9, 3, 11.5);
		context.bezierCurveTo(3, 7.4, 7, 4.1, 12, 4.1);
		context.bezierCurveTo(17, 4.1, 21, 7.4, 21, 11.5);
		context.closePath();
		context.stroke();
	});
}

export function repostIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(17, 4);
		context.lineTo(21, 8);
		context.lineTo(17, 12);
		context.moveTo(21, 8);
		context.lineTo(7, 8);
		context.bezierCurveTo(4.8, 8, 3, 9.8, 3, 12);
		context.lineTo(3, 13);
		context.moveTo(7, 20);
		context.lineTo(3, 16);
		context.lineTo(7, 12);
		context.moveTo(3, 16);
		context.lineTo(17, 16);
		context.bezierCurveTo(19.2, 16, 21, 14.2, 21, 12);
		context.lineTo(21, 11);
		context.stroke();
	});
}

export function shareIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(21, 3);
		context.lineTo(2.5, 10.5);
		context.lineTo(10, 13);
		context.lineTo(12.5, 20.5);
		context.closePath();
		context.moveTo(21, 3);
		context.lineTo(10, 13);
		context.stroke();
	});
}

export function viewsIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.lineWidth = 2.4;
		context.beginPath();
		context.moveTo(4, 20);
		context.lineTo(4, 14);
		context.moveTo(9.3, 20);
		context.lineTo(9.3, 9);
		context.moveTo(14.6, 20);
		context.lineTo(14.6, 12);
		context.moveTo(20, 20);
		context.lineTo(20, 4);
		context.stroke();
	});
}

export function cameraIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(3, 7);
		context.lineTo(7, 7);
		context.lineTo(9, 4.5);
		context.lineTo(15, 4.5);
		context.lineTo(17, 7);
		context.lineTo(21, 7);
		context.lineTo(21, 19);
		context.lineTo(3, 19);
		context.closePath();
		context.moveTo(15.2, 13);
		context.arc(12, 13, 3.4, 0, Math.PI * 2);
		context.stroke();
	});
}

export function microphoneIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(12, 3);
		context.bezierCurveTo(9.8, 3, 8, 4.8, 8, 7);
		context.lineTo(8, 12);
		context.bezierCurveTo(8, 14.2, 9.8, 16, 12, 16);
		context.bezierCurveTo(14.2, 16, 16, 14.2, 16, 12);
		context.lineTo(16, 7);
		context.bezierCurveTo(16, 4.8, 14.2, 3, 12, 3);
		context.closePath();
		context.moveTo(5, 11.5);
		context.bezierCurveTo(5, 15.6, 8.1, 18.8, 12, 18.8);
		context.bezierCurveTo(15.9, 18.8, 19, 15.6, 19, 11.5);
		context.moveTo(12, 18.8);
		context.lineTo(12, 21);
		context.stroke();
	});
}

export function imageIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(3, 5);
		context.lineTo(21, 5);
		context.lineTo(21, 19);
		context.lineTo(3, 19);
		context.closePath();
		context.moveTo(3, 16);
		context.lineTo(9, 10);
		context.lineTo(14, 15);
		context.lineTo(17, 12);
		context.lineTo(21, 16);
		context.moveTo(16.5, 9.2);
		context.arc(16.5, 9.2, 1.4, 0, Math.PI * 2);
		context.stroke();
	});
}

export function phoneIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(6, 3);
		context.lineTo(9, 8);
		context.lineTo(7, 11);
		context.bezierCurveTo(8.5, 14.5, 9.5, 15.5, 13, 17);
		context.lineTo(16, 15);
		context.lineTo(21, 18);
		context.lineTo(18.5, 21);
		context.bezierCurveTo(11, 21, 3, 13, 3, 5.5);
		context.closePath();
		context.stroke();
	});
}

export function videoIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(3, 6);
		context.lineTo(14, 6);
		context.lineTo(14, 18);
		context.lineTo(3, 18);
		context.closePath();
		context.moveTo(14, 10);
		context.lineTo(21, 6);
		context.lineTo(21, 18);
		context.lineTo(14, 14);
		context.closePath();
		context.stroke();
	});
}

export function dotsIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	ink: Ink,
): void {
	context.save();
	context.fillStyle = ink;
	for (let index = 0; index < 3; index += 1) {
		context.beginPath();
		context.arc(x + index * 22, y, 6, 0, Math.PI * 2);
		context.fill();
	}
	context.restore();
}
export function smileyIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.arc(12, 12, 9, 0, Math.PI * 2);
		context.moveTo(8.5, 9.5);
		context.lineTo(8.5, 10.6);
		context.moveTo(15.5, 9.5);
		context.lineTo(15.5, 10.6);
		context.moveTo(7.6, 14);
		context.bezierCurveTo(9, 16.4, 15, 16.4, 16.4, 14);
		context.stroke();
	});
}

export function paperclipIcon(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	ink: Ink,
): void {
	strokeScale(context, x, y, size, () => {
		context.strokeStyle = ink;
		context.beginPath();
		context.moveTo(20, 11.5);
		context.lineTo(11.5, 20);
		context.bezierCurveTo(9.6, 21.9, 6.4, 21.9, 4.5, 20);
		context.bezierCurveTo(2.6, 18.1, 2.6, 14.9, 4.5, 13);
		context.lineTo(13, 4.5);
		context.bezierCurveTo(14.2, 3.3, 16.3, 3.3, 17.5, 4.5);
		context.bezierCurveTo(18.7, 5.7, 18.7, 7.8, 17.5, 9);
		context.lineTo(9.5, 17);
		context.bezierCurveTo(8.9, 17.6, 7.9, 17.6, 7.3, 17);
		context.bezierCurveTo(6.7, 16.4, 6.7, 15.4, 7.3, 14.8);
		context.lineTo(15, 7);
		context.stroke();
	});
}
