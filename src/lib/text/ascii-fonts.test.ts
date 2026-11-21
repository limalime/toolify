import { describe, expect, it } from "vitest";
import { ASCII_FONT_STYLES, convertAsciiFont } from "./ascii-fonts";

describe("fancy unicode styles", () => {
	it("converts the alphabet styles", () => {
		expect(convertAsciiFont("Ab", "bold")).toBe("𝐀𝐛");
		expect(convertAsciiFont("Ab", "italic")).toBe("𝐴𝑏");
		expect(convertAsciiFont("A", "doubleStruck")).toBe("𝔸");
		expect(convertAsciiFont("a", "monospace")).toBe("𝚊");
		expect(convertAsciiFont("A", "fullwidth")).toBe("Ａ");
	});

	it("maps script holes and small caps", () => {
		expect(convertAsciiFont("Be", "script")).toBe("ℬℯ");
		expect(convertAsciiFont("Hello", "smallCaps")).toBe("Hᴇʟʟᴏ");
	});

	it("converts digits where the block has them", () => {
		expect(convertAsciiFont("09", "bold")).toBe("𝟎𝟗");
		expect(convertAsciiFont("09", "circled")).toBe("⓪⑨");
	});

	it("fills the famous holes", () => {
		expect(convertAsciiFont("CHNPQRZ", "doubleStruck")).toBe("ℂℍℕℙℚℝℤ");
		expect(convertAsciiFont("h", "italic")).toBe("ℎ");
	});

	it("passes unmapped characters through", () => {
		expect(convertAsciiFont("09", "italic")).toBe("09");
		expect(convertAsciiFont("A b!", "bold")).toBe("𝐀 𝐛!");
		expect(convertAsciiFont("É", "bold")).toBe("É");
	});

	it("ships ten styles", () => {
		expect(ASCII_FONT_STYLES).toHaveLength(10);
	});
});
