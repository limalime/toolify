// base64 and url coding, unicode safe. throws plain errors on bad input.
export function base64Encode(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

export function base64Decode(encoded: string): string {
	const clean = encoded.trim().replace(/\s+/g, "");
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
		throw new Error("invalid base64");
	}
	let binary: string;
	try {
		binary = atob(clean);
	} catch {
		throw new Error("invalid base64");
	}
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index++) {
		bytes[index] = binary.charCodeAt(index);
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		throw new Error("invalid base64");
	}
}

export function urlEncode(text: string): string {
	return encodeURIComponent(text);
}

export function urlDecode(encoded: string): string {
	try {
		return decodeURIComponent(encoded.replace(/\+/g, " "));
	} catch {
		throw new Error("invalid encoding");
	}
}
