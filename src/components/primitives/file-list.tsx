import { CircleCheck, File, LoaderCircle, TriangleAlert } from "lucide-react";
import {
	ProgressIndicator,
	ProgressRoot,
	ProgressTrack,
} from "@/components/smoothui/progress";
import SmoothButton from "@/components/smoothui/smooth-button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FileRowStatus = "queued" | "processing" | "done" | "failed";

export interface FileRow {
	downloadUrl?: string;
	error?: string;
	id: string;
	name: string;
	progress?: number;
	size: number;
	status: FileRowStatus;
}

export interface FileListProps {
	className?: string;
	files: FileRow[];
	onRetry?: (id: string) => void;
}

const STATUS_ICON = {
	done: { className: "text-success", icon: CircleCheck },
	failed: { className: "text-error", icon: TriangleAlert },
	processing: { className: "text-blue-500", icon: LoaderCircle },
	queued: { className: "text-text-3", icon: File },
} as const;

// one row per file with its own status, rows divide with the border token.
export default function FileList({ className, files, onRetry }: FileListProps) {
	return (
		<ul
			className={cn("w-full divide-y divide-border", className)}
			data-testid="file-list"
		>
			{files.map((file) => {
				const status = STATUS_ICON[file.status];
				const Icon = status.icon;
				return (
					<li
						className="flex min-h-16 items-center gap-3 py-3"
						data-status={file.status}
						key={file.id}
					>
						<Icon
							aria-hidden="true"
							className={cn(
								"size-5 shrink-0",
								status.className,
								file.status === "processing" &&
									"animate-spin motion-reduce:animate-none",
							)}
						/>
						<div className="min-w-0 flex-1">
							<p className="truncate text-small text-text">{file.name}</p>
							<p className="text-caption text-text-3">
								{formatBytes(file.size)}
							</p>
							{file.status === "processing" ? (
								<ProgressRoot
									aria-label={`Converting ${file.name}`}
									className="mt-2 gap-0"
									value={file.progress ?? null}
								>
									<ProgressTrack className="bg-surface-2" size="sm">
										<ProgressIndicator />
									</ProgressTrack>
								</ProgressRoot>
							) : null}
							{file.status === "failed" && file.error ? (
								<p className="mt-1 text-small text-error">{file.error}</p>
							) : null}
						</div>
						{file.status === "done" && file.downloadUrl ? (
							<SmoothButton
								asChild
								className="shrink-0"
								size="sm"
								variant="secondary"
							>
								<a download={file.name} href={file.downloadUrl}>
									Download
								</a>
							</SmoothButton>
						) : null}
						{file.status === "failed" && onRetry ? (
							<SmoothButton
								className="shrink-0"
								onClick={() => onRetry(file.id)}
								size="sm"
								variant="secondary"
							>
								Retry
							</SmoothButton>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}
