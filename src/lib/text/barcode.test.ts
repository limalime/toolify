import { describe, expect, it } from "vitest";
import { BARCODE_FORMATS, validateBarcode } from "./barcode";

describe("barcode validation", () => {
	it("accepts valid input per format", () => {
		expect(validateBarcode("CODE128", "Hello-123")).toBeNull();
		expect(validateBarcode("CODE39", "ABC-123")).toBeNull();
		expect(validateBarcode("EAN13", "5901234123457")).toBeNull();
		expect(validateBarcode("EAN8", "96385074")).toBeNull();
		expect(validateBarcode("UPC", "123456789012")).toBeNull();
		expect(validateBarcode("ITF", "1234")).toBeNull();
		expect(validateBarcode("MSI", "123")).toBeNull();
		expect(validateBarcode("pharmacode", "1234")).toBeNull();
		expect(validateBarcode("codabar", "A1234B")).toBeNull();
	});

	it("rejects bad input with a reason", () => {
		expect(validateBarcode("CODE128", "héllo")).toBe("ascii only");
		expect(validateBarcode("CODE39", "abc")).toBe("charset");
		expect(validateBarcode("EAN13", "123")).toBe("digits13");
		expect(validateBarcode("EAN8", "abcdefgh")).toBe("digits8");
		expect(validateBarcode("UPC", "123")).toBe("digits12");
		expect(validateBarcode("ITF", "123")).toBe("even digits");
		expect(validateBarcode("MSI", "12a")).toBe("digits");
		expect(validateBarcode("pharmacode", "2")).toBe("range");
		expect(validateBarcode("codabar", "xyz!")).toBe("charset");
		expect(validateBarcode("CODE128", "")).toBe("empty");
	});

	it("ships nine formats", () => {
		expect(BARCODE_FORMATS).toHaveLength(9);
	});
});
