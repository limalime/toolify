// barcode formats with honest input rules, checked before jsbarcode
// runs so failures explain themselves instead of throwing deep errors.
export type BarcodeFormat =
	| "CODE128"
	| "CODE39"
	| "EAN13"
	| "EAN8"
	| "UPC"
	| "ITF"
	| "MSI"
	| "pharmacode"
	| "codabar";

export const BARCODE_FORMATS: BarcodeFormat[] = [
	"CODE128",
	"CODE39",
	"EAN13",
	"EAN8",
	"UPC",
	"ITF",
	"MSI",
	"pharmacode",
	"codabar",
];

const CODE39_CHARSET = /^[A-Z0-9\-.\s$/+%]*$/;
const CODABAR_CHARSET = /^[A-D]?[0-9\-.$:/+]*[A-D]?$/;

export function validateBarcode(
	format: BarcodeFormat,
	text: string,
): string | null {
	if (!text) {
		return "empty";
	}
	switch (format) {
		case "CODE128": {
			for (const char of text) {
				if ((char.codePointAt(0) ?? 0) > 127) {
					return "ascii only";
				}
			}
			return null;
		}
		case "CODE39":
			return CODE39_CHARSET.test(text) ? null : "charset";
		case "EAN13":
			return /^[0-9]{13}$/.test(text) ? null : "digits13";
		case "EAN8":
			return /^[0-9]{8}$/.test(text) ? null : "digits8";
		case "UPC":
			return /^[0-9]{12}$/.test(text) ? null : "digits12";
		case "ITF":
			return /^[0-9]*$/.test(text) && text.length % 2 === 0 && text.length > 0
				? null
				: "even digits";
		case "MSI":
			return /^[0-9]+$/.test(text) ? null : "digits";
		case "pharmacode": {
			const value = Number(text);
			return /^[0-9]+$/.test(text) && value >= 3 && value <= 131070
				? null
				: "range";
		}
		case "codabar":
			return CODABAR_CHARSET.test(text.toUpperCase()) ? null : "charset";
	}
}
