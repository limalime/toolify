"use client";

import { useRef } from "react";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import type { FfmpegCore } from "@/lib/video/ffmpeg-core";

// engine state plus determinate progress, shared by every video tool.
// the high-water mark lets tests assert the bar really moved even when
// short jobs finish between assertion polls.
export default function JobStatus({
	applyLabel,
	core,
	coreMt,
	coreSt,
	loading,
	loadingLabel,
	progress,
}: {
	applyLabel: string;
	core: FfmpegCore | null;
	coreMt: string;
	coreSt: string;
	loading: boolean;
	loadingLabel: string;
	progress: number | null;
}) {
	const max = useRef(0);
	if (progress !== null && progress > max.current) {
		max.current = progress;
	}
	return (
		<div
			className="flex flex-col gap-2"
			data-max-progress={max.current}
			data-testid="video-job-status"
		>
			{loading ? (
				<>
					<span className="text-small text-text-2">{loadingLabel}</span>
					<ProgressRoot aria-label={loadingLabel} value={null}>
						<ProgressTrack className="bg-surface-2" size="sm">
							<ProgressIndicator />
						</ProgressTrack>
					</ProgressRoot>
				</>
			) : null}
			{progress !== null ? (
				<>
					<div className="flex items-center justify-between gap-2">
						<span className="text-small text-text-2" data-testid="video-stage">
							{applyLabel}
						</span>
						<output className="font-display text-small tabular-nums">
							{progress}%
						</output>
					</div>
					<ProgressRoot aria-label={applyLabel} value={progress}>
						<ProgressTrack className="bg-surface-2" size="sm">
							<ProgressIndicator />
						</ProgressTrack>
					</ProgressRoot>
				</>
			) : null}
			{core ? (
				<p className="text-small text-text-2" data-testid="video-core">
					{core === "mt" ? coreMt : coreSt}
				</p>
			) : null}
		</div>
	);
}
