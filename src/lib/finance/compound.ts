export type CompoundFrequency =
	| "annually"
	| "semiannually"
	| "quarterly"
	| "monthly"
	| "daily";

export const COMPOUND_PERIODS: Record<CompoundFrequency, number> = {
	annually: 1,
	semiannually: 2,
	quarterly: 4,
	monthly: 12,
	daily: 365,
};

export const COMPOUND_FREQUENCIES: CompoundFrequency[] = [
	"annually",
	"semiannually",
	"quarterly",
	"monthly",
	"daily",
];

export interface CompoundPoint {
	year: number;
	balance: number;
}

export interface CompoundSummary {
	finalBalance: number;
	totalInterest: number;
	principal: number;
}

// A = P(1 + r/n)^(nt), with the rate given in percent per year.
export function compoundBalance(
	principal: number,
	annualRate: number,
	years: number,
	frequency: CompoundFrequency,
): number {
	if (!Number.isFinite(principal) || principal <= 0) {
		return 0;
	}
	if (!Number.isFinite(years) || years <= 0) {
		return principal;
	}
	if (!Number.isFinite(annualRate) || annualRate === 0) {
		return principal;
	}
	const periods = COMPOUND_PERIODS[frequency];
	const growth = 1 + annualRate / 100 / periods;
	if (growth <= 0) {
		return principal;
	}
	return principal * growth ** (periods * years);
}

export function compoundSummary(
	principal: number,
	annualRate: number,
	years: number,
	frequency: CompoundFrequency,
): CompoundSummary {
	const finalBalance = compoundBalance(principal, annualRate, years, frequency);
	return {
		finalBalance,
		totalInterest: finalBalance - principal,
		principal,
	};
}

// one point per whole year, starting at year zero. a fractional term adds
// one final point so the chart ends exactly where the summary does.
export function compoundSchedule(
	principal: number,
	annualRate: number,
	years: number,
	frequency: CompoundFrequency,
): CompoundPoint[] {
	const wholeYears = Number.isFinite(years)
		? Math.max(0, Math.floor(years))
		: 0;
	const points: CompoundPoint[] = [];
	for (let year = 0; year <= wholeYears; year += 1) {
		points.push({
			year,
			balance: compoundBalance(principal, annualRate, year, frequency),
		});
	}
	if (years > wholeYears) {
		points.push({
			year: years,
			balance: compoundBalance(principal, annualRate, years, frequency),
		});
	}
	return points;
}
