// hashes in the browser. md5 is sync through a tiny lib, the sha
// family uses the platform subtle crypto.
import md5 from "md5";

export type HashName = "md5" | "sha1" | "sha256" | "sha512";

export const HASH_NAMES: HashName[] = ["md5", "sha1", "sha256", "sha512"];

export function hashMd5(text: string): string {
	return md5(text);
}

async function hashSubtle(text: string, algorithm: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		algorithm,
		new TextEncoder().encode(text),
	);
	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function hashText(text: string, name: HashName): Promise<string> {
	switch (name) {
		case "md5":
			return hashMd5(text);
		case "sha1":
			return hashSubtle(text, "SHA-1");
		case "sha256":
			return hashSubtle(text, "SHA-256");
		case "sha512":
			return hashSubtle(text, "SHA-512");
	}
}

export async function hashAll(text: string): Promise<Record<HashName, string>> {
	const [md5sum, sha1, sha256, sha512] = await Promise.all([
		hashText(text, "md5"),
		hashText(text, "sha1"),
		hashText(text, "sha256"),
		hashText(text, "sha512"),
	]);
	return { md5: md5sum, sha1, sha256, sha512 };
}
