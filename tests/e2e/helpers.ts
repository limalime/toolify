import { readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";

export const FIXTURES = {
	photo: "tests/fixtures/photo.png",
	pet: "tests/fixtures/pet.jpg",
	logo: "tests/fixtures/logo.png",
	heic: "tests/fixtures/sample.heic",
	ai: "tests/fixtures/sample.ai",
	pdf: "tests/fixtures/sample.pdf",
	inlineImage: "tests/fixtures/inline-image.pdf",
	imageHeavy: "tests/fixtures/image-heavy.pdf",
	flateImage: "tests/fixtures/flate-image.pdf",
	video: "tests/fixtures/sample.mp4",
	toneMp3: "tests/fixtures/tone.mp3",
	toneWav: "tests/fixtures/tone.wav",
};

export type Signature =
	| "png"
	| "jpg"
	| "webp"
	| "avif"
	| "ico"
	| "pdf"
	| "svg"
	| "zip"
	| "mp3"
	| "gif"
	| "mp4"
	| "mov"
	| "webm"
	| "wav"
	| "ogg"
	| "flac"
	| "m4a";

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
	if (new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp") {
		const brand = new TextDecoder().decode(bytes.slice(8, 12));
		if (brand === "qt  ") {
			return "mov";
		}
		if (brand.startsWith("avif") || brand.startsWith("avis")) {
			return "avif";
		}
		if (brand.startsWith("M4A")) {
			return "m4a";
		}
		return "mp4";
	}
	if (
		text.startsWith("RIFF") &&
		new TextDecoder().decode(bytes.slice(8, 12)) === "WAVE"
	) {
		return "wav";
	}
	if (text.startsWith("OggS")) {
		return "ogg";
	}
	if (text.startsWith("fLaC")) {
		return "flac";
	}
	if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) {
		return "webm";
	}
	if (
		text.startsWith("ID3") ||
		(bytes[0] === 0xff && ((bytes[1] as number) & 0xe0) === 0xe0)
	) {
		return "mp3";
	}
	if (text.startsWith("GIF87a") || text.startsWith("GIF89a")) {
		return "gif";
	}
	if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) {
		return "ico";
	}
	if (text.startsWith("%PDF")) {
		return "pdf";
	}
	if (new TextDecoder().decode(bytes.slice(0, 512)).includes("<svg")) {
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

export async function imageAlphaStats(
	page: Page,
	bytes: Uint8Array,
): Promise<{
	zeroPct: number;
	opaquePct: number;
	partialPct: number;
	center: number;
}> {
	return page.evaluate((raw) => {
		const data = Uint8Array.from(raw);
		const url = URL.createObjectURL(new Blob([data], { type: "image/png" }));
		return new Promise<{
			zeroPct: number;
			opaquePct: number;
			partialPct: number;
			center: number;
		}>((resolve, reject) => {
			const image = new Image();
			image.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = image.naturalWidth;
				canvas.height = image.naturalHeight;
				const context = canvas.getContext("2d");
				if (!context) {
					reject(new Error("no 2d context"));
					return;
				}
				context.drawImage(image, 0, 0);
				const px = context.getImageData(0, 0, canvas.width, canvas.height).data;
				let zero = 0;
				let opaque = 0;
				let partial = 0;
				for (let index = 3; index < px.length; index += 4) {
					const alpha = px[index];
					// a soft sigmoid never lands on exactly 255, so treat 250+
					// as kept and 5- as erased, the middle band is the edge.
					if (alpha <= 5) {
						zero++;
					} else if (alpha >= 250) {
						opaque++;
					} else {
						partial++;
					}
				}
				const total = px.length / 4;
				const center =
					px[
						(Math.floor(canvas.height / 2) * canvas.width +
							Math.floor(canvas.width / 2)) *
							4 +
							3
					];
				URL.revokeObjectURL(url);
				resolve({
					zeroPct: (zero / total) * 100,
					opaquePct: (opaque / total) * 100,
					partialPct: (partial / total) * 100,
					center,
				});
			};
			image.onerror = () => reject(new Error("could not decode image"));
			image.src = url;
		});
	}, Array.from(bytes));
}

export const PHONE_FIXTURES = {
	hevc: "tests/fixtures/generated/phone-hevc.mov",
	h263: "tests/fixtures/generated/phone-h263.3gp",
	large: "tests/fixtures/generated/phone-1080p.mp4",
};

// proves a media file actually plays, reporting duration and picture size.
export async function mediaProbe(
	page: Page,
	bytes: Uint8Array,
	mime: string,
): Promise<{ duration: number; width: number; height: number }> {
	return page.evaluate(
		({ raw, type }) => {
			const data = Uint8Array.from(raw);
			const url = URL.createObjectURL(new Blob([data], { type }));
			return new Promise<{ duration: number; width: number; height: number }>(
				(resolve, reject) => {
					const element = document.createElement("video");
					element.muted = true;
					element.preload = "metadata";
					element.onloadedmetadata = () => {
						URL.revokeObjectURL(url);
						resolve({
							duration: element.duration,
							width: element.videoWidth,
							height: element.videoHeight,
						});
					};
					element.onerror = () => reject(new Error("could not play media"));
					element.src = url;
				},
			);
		},
		{ raw: Array.from(bytes), type: mime },
	);
}
