import { describe, expect, it } from "vitest";
import {
	checkMnemonic,
	derivationPath,
	deriveAddress,
	newMnemonic,
} from "./wallet";

// vectors cross-checked against the independent bip_utils library.
const REFERENCE = [...Array(11).fill("abandon"), "about"].join(" ");

describe("wallet derivation", () => {
	it("generates valid mnemonics", () => {
		expect(checkMnemonic(newMnemonic(12))).toBe(true);
		expect(newMnemonic(24).split(" ")).toHaveLength(24);
		expect(checkMnemonic("abandon abandon")).toBe(false);
	});

	it("derives legacy, wrapped, native, and taproot btc", () => {
		const base = { coin: "BTC", account: 0, change: 0, index: 0 } as const;
		expect(deriveAddress(REFERENCE, { ...base, purpose: 44 }).address).toBe(
			"1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA",
		);
		expect(deriveAddress(REFERENCE, { ...base, purpose: 49 }).address).toBe(
			"37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf",
		);
		expect(deriveAddress(REFERENCE, { ...base, purpose: 84 }).address).toBe(
			"bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu",
		);
		expect(deriveAddress(REFERENCE, { ...base, purpose: 86 }).address).toBe(
			"bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr",
		);
	});

	it("derives eth and ltc addresses", () => {
		expect(
			deriveAddress(REFERENCE, {
				coin: "ETH",
				purpose: 44,
				account: 0,
				change: 0,
				index: 0,
			}).address,
		).toBe("0x9858EfFD232B4033E47d90003D41EC34EcaEda94");
		expect(
			deriveAddress(REFERENCE, {
				coin: "LTC",
				purpose: 84,
				account: 0,
				change: 0,
				index: 0,
			}).address,
		).toBe("ltc1qjmxnz78nmc8nq77wuxh25n2es7rzm5c2rkk4wh");
	});

	it("builds paths with eth locked to purpose 44", () => {
		expect(
			derivationPath({
				coin: "BTC",
				purpose: 84,
				account: 1,
				change: 0,
				index: 5,
			}),
		).toBe("m/84'/0'/1'/0/5");
		expect(
			derivationPath({
				coin: "ETH",
				purpose: 86,
				account: 0,
				change: 0,
				index: 0,
			}),
		).toBe("m/44'/60'/0'/0/0");
	});

	it("rejects bad mnemonics and values", () => {
		expect(() =>
			deriveAddress("abandon abandon", {
				coin: "BTC",
				purpose: 44,
				account: 0,
				change: 0,
				index: 0,
			}),
		).toThrow("invalid mnemonic");
		expect(() =>
			deriveAddress(REFERENCE, {
				coin: "BTC",
				purpose: 44,
				account: -1,
				change: 0,
				index: 0,
			}),
		).toThrow("invalid derivation value");
	});
});
