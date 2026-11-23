import { describe, expect, it } from "vitest";
import {
	CalcError,
	evaluate,
	evaluateCalculator,
	formatResult,
	tokenize,
} from "./calc";

describe("calculator", () => {
	it("respects precedence and parentheses", () => {
		expect(evaluate("2+3*4")).toBe(14);
		expect(evaluate("(2+3)*4")).toBe(20);
		expect(evaluate("10/4")).toBe(2.5);
		expect(evaluate("-3+5")).toBe(2);
		expect(evaluate("2*-3")).toBe(-6);
	});

	it("reads calculator percent semantics", () => {
		expect(evaluateCalculator("200+10%")).toBe(220);
		expect(evaluateCalculator("200-10%")).toBe(180);
		expect(evaluateCalculator("50*10%")).toBe(5);
		expect(evaluateCalculator("10%")).toBe(0.1);
	});

	it("accepts pretty symbols", () => {
		expect(evaluate("6 × 7")).toBe(42);
		expect(evaluate("9 ÷ 3")).toBe(3);
	});

	it("rejects bad input", () => {
		expect(() => evaluate("2+")).toThrow(CalcError);
		expect(() => evaluate("2/0")).toThrow(CalcError);
		expect(() => evaluate("abc")).toThrow(CalcError);
		expect(() => evaluate("1..2")).toThrow(CalcError);
		expect(tokenize("(1+2)")).toHaveLength(5);
	});

	it("formats results without trailing noise", () => {
		expect(formatResult(4)).toBe("4");
		expect(formatResult(0.30000000000000004)).toBe("0.3");
		expect(formatResult(Number.POSITIVE_INFINITY)).toBe("Error");
	});
});