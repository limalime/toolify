// every text encoding on one screen. all sync, keccak through js-sha3.
import { keccak256, keccak512 } from "js-sha3";
import { base64Encode } from "./codec";

export function hexEncode(text: string): string {
	return [...new TextEncoder().encode(text)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let out = "";
	let bits = 0;
	let value = 0;
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) {
		out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
	}
	while (out.length % 8 !== 0) {
		out += "=";
	}
	return out;
}

export function binaryEncode(text: string): string {
	return [...new TextEncoder().encode(text)]
		.map((byte) => byte.toString(2).padStart(8, "0"))
		.join(" ");
}

export function rot13(text: string): string {
	return text.replace(/[a-z]/gi, (char) => {
		const base = char <= "Z" ? 65 : 97;
		return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
	});
}

export function htmlEscape(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let index = 0; index < 256; index++) {
		let entry = index;
		for (let bit = 0; bit < 8; bit++) {
			entry = entry & 1 ? 0xedb88320 ^ (entry >>> 1) : entry >>> 1;
		}
		table[index] = entry;
	}
	return table;
})();

export function crc32(text: string): string {
	let hash = 0xffffffff;
	for (const byte of new TextEncoder().encode(text)) {
		hash = (CRC_TABLE[(hash ^ byte) & 0xff] as number) ^ (hash >>> 8);
	}
	return ((hash ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export interface TextEncodings {
	hex: string;
	base64: string;
	base32: string;
	binary: string;
	rot13: string;
	html: string;
	keccak256: string;
	keccak512: string;
	crc32: string;
}

export function encodeAll(text: string): TextEncodings {
	return {
		hex: hexEncode(text),
		base64: base64Encode(text),
		base32: base32Encode(text),
		binary: binaryEncode(text),
		rot13: rot13(text),
		html: htmlEscape(text),
		keccak256: keccak256(text),
		keccak512: keccak512(text),
		crc32: crc32(text),
	};
}
