import { describe, expect, it } from "vitest";
import {
	type CompoundFrequency,
	compoundBalance,
	compoundSchedule,
	compoundSummary,
} from "./compound";

const FREQUENCIES: CompoundFrequency[] = [
	"annually",
	"semiannually",
	"quarterly",
	"monthly",
	"daily",
];

describe("compound interest", () => {
	it("matches hand computed balances", () => {
		expect(compoundBalance(1000, 5, 10, "annually")).toBeCloseTo(
			1628.894626777442,
			6,
		);
		expect(compoundBalance(1000, 5, 10, "monthly")).toBeCloseTo(
			1647.00949769028,
			6,
		);
		expect(compoundBalance(10000, 7, 20, "quarterly")).toBeCloseTo(
			40063.91924249398,
			6,
		);
	});

	it("keeps the principal when the rate or term is zero", () => {
		expect(compoundBalance(1000, 0, 10, "daily")).toBe(1000);
		expect(compoundBalance(1000, 5, 0, "monthly")).toBe(1000);
	});

	it("builds a point per year and totals the interest", () => {
		const summary = compoundSummary(1000, 5, 10, "monthly");
		expect(summary.totalInterest).toBeCloseTo(647.00949769028, 6);
		expect(summary.finalBalance).toBeCloseTo(1647.00949769028, 6);
		const schedule = compoundSchedule(1000, 5, 3, "annually");
		expect(schedule).toHaveLength(4);
		expect(schedule[0]).toEqual({ year: 0, balance: 1000 });
		expect(schedule[3]?.balance).toBeCloseTo(1157.625, 6);
	});

	it("adds a fractional final year once", () => {
		const schedule = compoundSchedule(1000, 5, 1.5, "annually");
		expect(schedule).toHaveLength(3);
		expect(schedule[2]?.year).toBe(1.5);
		expect(schedule[2]?.balance).toBeCloseTo(
			compoundBalance(1000, 5, 1.5, "annually"),
			6,
		);
	});

	it("supports every compounding frequency", () => {
		for (const frequency of FREQUENCIES) {
			expect(compoundBalance(1000, 5, 1, frequency)).toBeGreaterThan(1000);
		}
	});
});
