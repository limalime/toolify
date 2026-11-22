"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { toolSlugFromPath } from "@/lib/analytics";
import { trackToolComplete } from "@/lib/analytics-client";

// live tools call this once their output is valid. file tools report
// through download and copy actions instead, so completion means a
// result actually reached the visitor.
export function useToolCompleted(ready: boolean, armed = true) {
	const pathname = usePathname();
	const slug = toolSlugFromPath(pathname);
	const fired = useRef(false);

	useEffect(() => {
		if (fired.current || !ready || !armed || !slug) {
			return;
		}
		fired.current = true;
		trackToolComplete(slug);
	}, [armed, ready, slug]);
}
