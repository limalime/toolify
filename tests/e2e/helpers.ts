import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";

export const FIXTURES = {
	photo: "tests/fixtures/photo.png",
	logo: "tests/fixtures/logo.png",
	heic: "tests/fixtures/sample.heic",
	ai: "tests/fixtures/sample.ai",
};

export type Signature =
	| "png"
	| "jpg"
	| "webp"
	| "avif"
	| "ico"
	| "pdf"
	| "svg"
	| "zip";

const startsWith = (bytes: Uint8Array, head: number[]): boolean =>
	head.every((byte, index) => bytes[index] === byte);

// identifies a download by magic bytes, never by extension.
export function signatureOf(bytes: Uint8Array): Signature | "unknown" {
	const text = new TextDecoder().decode(bytes.slice(0, 8));
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
		return "png";
	}
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
		return "jpg";
	}
	if (
		text.startsWith("RIFF") &&
		new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
	) {
		return "webp";
	}
	if (new TextDecoder().decode(bytes.slice(4, 12)).startsWith("ftyp")) {
		return "avif";
	}
	if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) {
		return "ico";
	}
	if (text.startsWith("%PDF")) {
		return "pdf";
	}
	if (new TextDecoder().decode(bytes.slice(0, 64)).includes("<svg")) {
		return "svg";
	}
	if (text.startsWith("PK")) {
		return "zip";
	}
	return "unknown";
}

export async function downloadBytes(
	page: Page,
	trigger: Locator,
): Promise<{ bytes: Uint8Array; filename: string }> {
	const [download] = await Promise.all([
		page.waitForEvent("download"),
		trigger.click(),
	]);
	const path = await download.path();
	if (!path) {
		throw new Error("download produced no file");
	}
	return {
		bytes: new Uint8Array(readFileSync(path)),
		filename: download.suggestedFilename(),
	};
}

export async function imageDims(
	page: Page,
	bytes: Uint8Array,
): Promise<{ width: number; height: number }> {
	return page.evaluate((raw) => {
		const data = Uint8Array.from(raw);
		const url = URL.createObjectURL(new Blob([data]));
		return new Promise<{ width: number; height: number }>((resolve, reject) => {
			const image = new Image();
			image.onload = () => {
				URL.revokeObjectURL(url);
				resolve({ width: image.naturalWidth, height: image.naturalHeight });
			};
			image.onerror = () => reject(new Error("could not decode image"));
			image.src = url;
		});
	}, Array.from(bytes));
}
