// video metadata through a throwaway element. resolves duration and
// dimensions, rejects when the file is not playable video.
import { readContainerMeta } from "@/lib/video/container";

export interface VideoMeta {
	durationSec: number;
	width: number;
	height: number;
}

export const VIDEO_ACCEPT = "video/*";
export const AUDIO_ACCEPT = "audio/*";

function probeMedia(file: File, tag: "audio" | "video"): Promise<VideoMeta> {
	const url = URL.createObjectURL(file);
	return new Promise<VideoMeta>((resolve, reject) => {
		const element = document.createElement(tag);
		element.preload = "metadata";
		(element as HTMLVideoElement).muted = true;
		element.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			const media = element as HTMLVideoElement;
			if (!Number.isFinite(media.duration) || media.duration <= 0) {
				reject(new Error("no duration"));
				return;
			}
			// chromium reads the container of an hevc mov but decodes no
			// frames, so duration arrives with a 0x0 picture. that is not
			// usable metadata, let the container parser answer instead.
			if (tag === "video" && (media.videoWidth <= 0 || media.videoHeight <= 0)) {
				reject(new Error("no picture"));
				return;
			}
			resolve({
				durationSec: media.duration,
				width: media.videoWidth,
				height: media.videoHeight,
			});
		};
		element.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("unplayable media"));
		};
		element.src = url;
	});
}

export function probeVideo(file: File): Promise<VideoMeta> {
	return probeMedia(file, "video");
}

// the preview element cannot decode every phone file. mov with hevc and
// 3gp with h263 are common examples, so read the container instead.
export async function probeVideoOrMeta(file: File): Promise<VideoMeta> {
	try {
		return await probeVideo(file);
	} catch {
		const meta = await readContainerMeta(file);
		if (meta) {
			return meta;
		}
		throw new Error("unsupported video");
	}
}

export function probeAudio(file: File): Promise<VideoMeta> {
	return probeMedia(file, "audio");
}

export function formatDuration(totalSec: number): string {
	const clamped = Math.max(0, totalSec);
	const minutes = Math.floor(clamped / 60);
	const seconds = Math.floor(clamped % 60);
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
