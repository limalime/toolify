"use client";

import { UploadCloud } from "lucide-react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface DropzoneProps {
	accept?: string;
	browseLabel: string;
	className?: string;
	disabled?: boolean;
	hint: string;
	multiple?: boolean;
	onFiles: (files: File[]) => void;
}

// dashed blue drop area. drag over turns the border solid and lifts the
// surface. the whole box is a label so click and keyboard both reach the input.
export default function Dropzone({
	accept,
	browseLabel,
	className,
	disabled = false,
	hint,
	multiple = false,
	onFiles,
}: DropzoneProps) {
	const inputId = useId();
	const [dragging, setDragging] = useState(false);
	const depth = useRef(0);

	const pick = (files: FileList | null) => {
		if (!files || disabled) {
			return;
		}
		onFiles(Array.from(files));
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop container needs drag handlers, the label plus input carry click and keyboard
		<div
			data-testid="dropzone"
			onDragEnter={(event) => {
				event.preventDefault();
				if (disabled) {
					return;
				}
				depth.current += 1;
				setDragging(true);
			}}
			onDragLeave={(event) => {
				event.preventDefault();
				depth.current = Math.max(0, depth.current - 1);
				if (depth.current === 0) {
					setDragging(false);
				}
			}}
			onDragOver={(event) => event.preventDefault()}
			onDrop={(event) => {
				event.preventDefault();
				depth.current = 0;
				setDragging(false);
				pick(event.dataTransfer.files);
			}}
		>
			<label
				className={cn(
					"flex min-h-44 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-blue-500 bg-surface px-6 py-10 text-center has-focus-visible:outline-2 has-focus-visible:outline-blue-500 has-focus-visible:outline-offset-2",
					dragging && "border-solid bg-surface-2",
					disabled && "cursor-not-allowed opacity-50",
					className,
				)}
				htmlFor={inputId}
			>
				<UploadCloud aria-hidden="true" className="size-8 text-blue-500" />
				<p className="text-body text-text-2">
					{hint}{" "}
					<span className="text-blue-500 underline underline-offset-4">
						{browseLabel}
					</span>
				</p>
			</label>
			<input
				accept={accept}
				className="sr-only"
				disabled={disabled}
				id={inputId}
				multiple={multiple}
				onChange={(event) => {
					pick(event.target.files);
					event.target.value = "";
				}}
				type="file"
			/>
		</div>
	);
}
