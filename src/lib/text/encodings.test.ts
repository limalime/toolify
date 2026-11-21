import { keccak256 } from "js-sha3";
import { describe, expect, it } from "vitest";
import {
	base32Encode,
	binaryEncode,
	crc32,
	encodeAll,
	hexEncode,
	htmlEscape,
	rot13,
} from "./encodings";

describe("text encodings", () => {
	it("encodes the simple transforms", () => {
		expect(hexEncode("Hi")).toBe("4869");
		expect(base32Encode("foo")).toBe("MZXW6===");
		expect(base32Encode("foobar")).toBe("MZXW6YTBOI======");
		expect(binaryEncode("A")).toBe("01000001");
		expect(rot13("Hello")).toBe("Uryyb");
		expect(htmlEscape('<a href="x">&')).toBe(
			"&lt;a href=&quot;x&quot;&gt;&amp;",
		);
	});

	it("hashes keccak and crc to known vectors", () => {
		expect(keccak256("")).toBe(
			"c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
		);
		expect(crc32("123456789")).toBe("cbf43926");
	});

	it("returns every encoding at once", () => {
		const all = encodeAll("Hi");
		expect(all.hex).toBe("4869");
		expect(all.base64).toBe("SGk=");
		expect(all.keccak256).toHaveLength(64);
		expect(all.keccak512).toHaveLength(128);
		expect(Object.keys(all)).toHaveLength(9);
	});
});
