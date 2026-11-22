export interface LoanSummary {
	payment: number;
	totalInterest: number;
	totalPaid: number;
}

export interface AmortizationRow {
	period: number;
	payment: number;
	interest: number;
	principal: number;
	balance: number;
}

// standard amortising payment: P * r / (1 - (1 + r)^-n), rate in percent.
export function monthlyPayment(
	principal: number,
	annualRate: number,
	months: number,
): number {
	if (!Number.isFinite(principal) || principal <= 0) {
		return 0;
	}
	if (!Number.isFinite(months) || months <= 0) {
		return 0;
	}
	const rate = annualRate / 100 / 12;
	if (!Number.isFinite(rate) || rate <= 0) {
		return principal / months;
	}
	const factor = (1 + rate) ** months;
	return (principal * rate * factor) / (factor - 1);
}

export function loanSummary(
	principal: number,
	annualRate: number,
	months: number,
): LoanSummary {
	const payment = monthlyPayment(principal, annualRate, months);
	const totalPaid = payment * months;
	return {
		payment,
		totalInterest: totalPaid - principal,
		totalPaid,
	};
}

// month by month. the final row is pinned to a zero balance so rounding
// never leaves a stray cent on the schedule.
export function amortizationSchedule(
	principal: number,
	annualRate: number,
	months: number,
): AmortizationRow[] {
	if (!Number.isFinite(principal) || principal <= 0) {
		return [];
	}
	if (!Number.isFinite(months) || months <= 0) {
		return [];
	}
	const count = Math.floor(months);
	const payment = monthlyPayment(principal, annualRate, count);
	const rate = annualRate / 100 / 12;
	const rows: AmortizationRow[] = [];
	let balance = principal;
	for (let period = 1; period <= count; period += 1) {
		const interest = balance * rate;
		let principalPart = payment - interest;
		let balanceAfter = balance - principalPart;
		if (period === count || balanceAfter < 0) {
			principalPart = balance;
			balanceAfter = 0;
		}
		rows.push({
			period,
			payment: principalPart + interest,
			interest,
			principal: principalPart,
			balance: balanceAfter,
		});
		balance = balanceAfter;
	}
	return rows;
}
