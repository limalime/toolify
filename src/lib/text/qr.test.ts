import { describe, expect, it } from "vitest";
import { buildQrContent, QR_MAX_BYTES } from "./qr";

describe("qr payload builders", () => {
	it("passes text and urls through untouched", () => {
		expect(buildQrContent("text", { text: "  hello  " })).toBe("hello");
		expect(buildQrContent("url", { text: "example.com" })).toBe("example.com");
	});

	it("builds wifi credentials with escaping", () => {
		expect(
			buildQrContent("wifi", {
				encryption: "WPA",
				ssid: "my;net",
				password: "p:ss",
				hidden: "0",
			}),
		).toBe("WIFI:T:WPA;S:my\\;net;P:p\\:ss;H:false;;");
	});

	it("builds a vcard with optional lines skipped", () => {
		const card = buildQrContent("vcard", {
			first: "Ada",
			last: "Lovelace",
			phone: "+441234",
			email: "",
			org: "",
			url: "",
		});
		expect(card).toContain("BEGIN:VCARD");
		expect(card).toContain("N:Lovelace;Ada;;;");
		expect(card).toContain("TEL;TYPE=CELL:+441234");
		expect(card).not.toContain("EMAIL");
		expect(card).toContain("END:VCARD");
	});

	it("builds mailto, sms, tel, and geo links", () => {
		expect(
			buildQrContent("email", { to: "a@b.co", subject: "hi there", body: "" }),
		).toBe("mailto:a@b.co?subject=hi+there");
		expect(buildQrContent("sms", { number: "123", body: "yo!" })).toBe(
			"sms:123?body=yo!",
		);
		expect(buildQrContent("phone", { number: "+1 234 567" })).toBe(
			"tel:+1234567",
		);
		expect(
			buildQrContent("geo", { latitude: "-6.2", longitude: "106.8" }),
		).toBe("geo:-6.2,106.8");
	});

	it("rejects bad coordinates", () => {
		expect(() =>
			buildQrContent("geo", { latitude: "91", longitude: "0" }),
		).toThrow("invalid coordinates");
		expect(() =>
			buildQrContent("geo", { latitude: "x", longitude: "0" }),
		).toThrow("invalid coordinates");
	});

	it("rejects empty and oversized content", () => {
		expect(() => buildQrContent("text", { text: "   " })).toThrow(
			"empty content",
		);
		expect(() =>
			buildQrContent("text", { text: "x".repeat(QR_MAX_BYTES + 1) }),
		).toThrow("content too long for a qr code");
	});
});
