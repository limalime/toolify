import { unzipSync, zipSync } from "fflate";

export interface ZipEntry {
	name: string;
	bytes: Uint8Array;
}

// many converted files into one zip download.
export function zipFiles(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
	const files: Record<string, Uint8Array> = {};
	for (const entry of entries) {
		files[entry.name] = entry.bytes;
	}
	return new Uint8Array(zipSync(files, { level: 6 }));
}

export function unzipFiles(bytes: Uint8Array): Record<string, Uint8Array> {
	return unzipSync(bytes);
}
