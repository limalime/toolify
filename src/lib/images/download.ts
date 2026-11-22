// triggers a browser download for in-memory bytes, then cleans up.
import { trackToolComplete } from "@/lib/analytics-client";

export function downloadBlob(blob: Blob, filename: string): void {
	trackToolComplete();
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBytes(
	bytes: ArrayBuffer,
	mime: string,
	filename: string,
): void {
	downloadBlob(new Blob([bytes], { type: mime }), filename);
}
