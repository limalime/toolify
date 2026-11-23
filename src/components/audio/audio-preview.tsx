"use client";

import { useEffect, useState } from "react";

// shows the picked file immediately, before any encoding starts. the
// object url lives only while the file is mounted.
export default function AudioPreview({
	file,
	label,
}: {
	file: File | null;
	label: string;
}) {
	const [url, setUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!file) {
			setUrl(null);
			return;
		}
		const next = URL.createObjectURL(file);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [file]);

	if (!file || !url) {
		return null;
	}

	return (
		<div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
			<span className="truncate text-caption text-text-3">{label}</span>
			{/* biome-ignore lint/a11y/useMediaCaption: user-file preview, no captions exist */}
			<audio
				aria-label={label}
				className="w-full"
				controls
				data-testid="source-audio-preview"
				preload="metadata"
				src={url}
			/>
		</div>
	);
}