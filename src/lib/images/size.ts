// parses human sizes like 500 KB or 1.5MB into bytes. bare numbers
// mean kilobytes, the unit people intend for image targets.
export function parseTargetSize(text: string): number | null {
	const match = text.trim().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/i);
	if (!match) {
		return null;
	}
	const value = Number(match[1]);
	const unit = (match[2] ?? "kb").toLowerCase();
	if (!Number.isFinite(value) || value <= 0) {
		return null;
	}
	const factor =
		unit === "b"
			? 1
			: unit === "kb"
				? 1024
				: unit === "mb"
					? 1024 ** 2
					: 1024 ** 3;
	const bytes = Math.floor(value * factor);
	return bytes > 0 ? bytes : null;
}
