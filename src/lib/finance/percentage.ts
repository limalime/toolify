// three everyday percentage questions. every function takes plain
// numbers and returns a number, so the ui only formats.
export function percentOf(percent: number, value: number): number {
	if (!Number.isFinite(percent) || !Number.isFinite(value)) {
		return 0;
	}
	return (percent / 100) * value;
}

// null when the starting value is zero, because change from nothing has
// no meaningful percentage.
export function percentChange(from: number, to: number): number | null {
	if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) {
		return null;
	}
	return ((to - from) / Math.abs(from)) * 100;
}

export function increasedValue(value: number, percent: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(percent)) {
		return 0;
	}
	return value * (1 + percent / 100);
}

export function decreasedValue(value: number, percent: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(percent)) {
		return 0;
	}
	return value * (1 - percent / 100);
}
