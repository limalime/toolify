import { describe, expect, it } from "vitest";
import { amortizationSchedule, loanSummary, monthlyPayment } from "./loan";

describe("loan math", () => {
	it("matches the hand computed monthly payment", () => {
		expect(monthlyPayment(300000, 6, 360)).toBeCloseTo(1798.6515754582708, 6);
		expect(monthlyPayment(200000, 4.5, 180)).toBeCloseTo(1529.9865776269262, 6);
	});

	it("totals interest and payments", () => {
		const summary = loanSummary(300000, 6, 360);
		expect(summary.payment).toBeCloseTo(1798.6515754582708, 6);
		expect(summary.totalInterest).toBeCloseTo(347514.56716497755, 6);
		expect(summary.totalPaid).toBeCloseTo(647514.5671649775, 6);
	});

	it("builds the amortization schedule down to zero", () => {
		const rows = amortizationSchedule(300000, 6, 360);
		expect(rows).toHaveLength(360);
		expect(rows[0]?.interest).toBeCloseTo(1500, 6);
		expect(rows[0]?.principal).toBeCloseTo(298.6515754582708, 6);
		expect(rows[0]?.balance).toBeCloseTo(299701.3484245417, 6);
		expect(rows[359]?.balance).toBe(0);
		expect(rows.reduce((sum, row) => sum + row.interest, 0)).toBeCloseTo(
			347514.56716497755,
			4,
		);
	});

	it("handles a zero rate and a zero amount", () => {
		expect(monthlyPayment(1200, 0, 12)).toBe(100);
		const summary = loanSummary(1200, 0, 12);
		expect(summary.totalInterest).toBe(0);
		expect(summary.totalPaid).toBe(1200);
		expect(monthlyPayment(0, 6, 360)).toBe(0);
		expect(amortizationSchedule(1200, 0, 12)[11]?.balance).toBe(0);
	});
});
