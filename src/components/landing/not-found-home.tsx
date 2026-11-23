"use client";

import SmoothButton from "@/components/smoothui/smooth-button";
import { Link } from "@/i18n/navigation";

export default function NotFoundHome({ label }: { label: string }) {
	return (
		<SmoothButton asChild size="lg" variant="candy">
			<Link href="/">{label}</Link>
		</SmoothButton>
	);
}