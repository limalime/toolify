import { describe, expect, it } from "vitest";
import {
	generatePassword,
	passwordEntropyBits,
	passwordPool,
	passwordStrength,
} from "./password";

describe("password generator", () => {
	it("builds the pool from sets", () => {
		const pool = passwordPool(
			{ lower: true, upper: false, digits: true, symbols: false },
			false,
		);
		expect(pool).toContain("a");
		expect(pool).toContain("5");
		expect(pool).not.toContain("A");
	});

	it("drops ambiguous characters on request", () => {
		const pool = passwordPool(
			{ lower: true, upper: true, digits: true, symbols: false },
			true,
		);
		for (const char of ["l", "1", "I", "O", "0", "o"]) {
			expect(pool).not.toContain(char);
		}
	});

	it("scores entropy honestly", () => {
		expect(passwordEntropyBits(8, 26)).toBeLessThan(50);
		expect(passwordStrength(passwordEntropyBits(8, 26))).toBe("weak");
		expect(passwordStrength(passwordEntropyBits(20, 90))).toBe("excellent");
	});

	it("generates from the pool only", () => {
		const password = generatePassword(32, "abc");
		expect(password).toHaveLength(32);
		expect(/^[abc]+$/.test(password)).toBe(true);
		expect(() => generatePassword(8, "")).toThrow("empty pool");
	});
});
