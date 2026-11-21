// waveform peaks from decoded samples. one normalized peak per
// bucket, mono mix when two channels arrive.
export function peaksFromSamples(
	channels: Float32Array[],
	buckets: number,
): number[] {
	const length = channels[0]?.length ?? 0;
	if (length === 0 || buckets <= 0) {
		return [];
	}
	const peaks: number[] = [];
	const perBucket = length / buckets;
	for (let bucket = 0; bucket < buckets; bucket++) {
		const start = Math.floor(bucket * perBucket);
		const end = Math.max(start + 1, Math.floor((bucket + 1) * perBucket));
		let peak = 0;
		for (const channel of channels) {
			for (let index = start; index < end && index < length; index++) {
				const value = Math.abs(channel[index] as number);
				if (value > peak) {
					peak = value;
				}
			}
		}
		peaks.push(Math.min(1, peak));
	}
	return peaks;
}
