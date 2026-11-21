import { describe, expect, it } from "vitest";
import { base64Decode, base64Encode, urlDecode, urlEncode } from "./codec";

describe("encoders", () => {
	it("roundtrips base64 with unicode", () => {
		expect(base64Encode("héllo 👋")).toBe("aMOpbGxvIPCfkYs=");
		expect(base64Decode("aMOpbGxvIPCfkYs=")).toBe("héllo 👋");
	});

	it("rejects bad base64", () => {
		expect(() => base64Decode("!!!")).toThrow("invalid base64");
		expect(() => base64Decode("abc")).toThrow("invalid base64");
	});

	it("roundtrips url encoding", () => {
		expect(urlEncode("a b&c=d?")).toBe("a%20b%26c%3Dd%3F");
		expect(urlDecode("a%20b%26c%3Dd%3F")).toBe("a b&c=d?");
		expect(urlDecode("a+b")).toBe("a b");
	});

	it("rejects bad url encoding", () => {
		expect(() => urlDecode("%E0%A4%A")).toThrow("invalid encoding");
	});
});
