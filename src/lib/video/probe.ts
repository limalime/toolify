// video metadata through a throwaway element. resolves duration and
// dimensions, rejects when the file is not playable video.
export interface VideoMeta {
	durationSec: number;
	width: number;
	height: number;
}

export const VIDEO_ACCEPT = "video/*";

export function probeVideo(file: File): Promise<VideoMeta> {
	const url = URL.createObjectURL(file);
	return new Promise<VideoMeta>((resolve, reject) => {
		const element = document.createElement("video");
		element.preload = "metadata";
		element.muted = true;
		element.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			if (!Number.isFinite(element.duration) || element.duration <= 0) {
				reject(new Error("no duration"));
				return;
			}
			resolve({
				durationSec: element.duration,
				width: element.videoWidth,
				height: element.videoHeight,
			});
		};
		element.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("unplayable video"));
		};
		element.src = url;
	});
}
