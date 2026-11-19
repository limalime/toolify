import Image from "next/image";
import { cn } from "@/lib/utils";

export interface LoadingProps {
	className?: string;
	status: string;
}

// pulsing logo mark plus a status line, never a bare spinner alone.
export default function Loading({ className, status }: LoadingProps) {
	return (
		<div
			className={cn("flex w-full flex-col items-center gap-3 py-10", className)}
			data-testid="loading"
			role="status"
		>
			<Image
				alt="Toolify"
				className="size-12 animate-logo-pulse motion-reduce:animate-none"
				height={48}
				src="/assets/logo-blue-square-1080.png"
				width={48}
			/>
			<p className="text-small text-text-2">{status}</p>
		</div>
	);
}
