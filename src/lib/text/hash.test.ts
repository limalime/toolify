import { describe, expect, it } from "vitest";
import { HASH_NAMES, hashAll, hashText } from "./hash";

describe("hash generator", () => {
	it("hashes the empty string to known vectors", async () => {
		expect(await hashText("", "md5")).toBe("d41d8cd98f00b204e9800998ecf8427e");
		expect(await hashText("", "sha1")).toBe(
			"da39a3ee5e6b4b0d3255bfef95601890afd80709",
		);
		expect(await hashText("", "sha256")).toBe(
			"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
		);
		expect(await hashText("", "sha512")).toBe(
			"cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
		);
	});

	it("hashes text to known vectors", async () => {
		expect(await hashText("abc", "md5")).toBe(
			"900150983cd24fb0d6963f7d28e17f72",
		);
		expect(await hashText("abc", "sha256")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});

	it("returns all four at once", async () => {
		const all = await hashAll("x");
		expect(Object.keys(all).sort()).toEqual([...HASH_NAMES].sort());
		expect(all.sha1).toHaveLength(40);
		expect(all.sha512).toHaveLength(128);
	});
});
