// clipboard copy with an old-browser fallback. returns false instead
// of throwing so callers can notify honestly either way.
import { trackToolComplete } from "@/lib/analytics-client";

export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		trackToolComplete();
		return true;
	} catch {
		try {
			const area = document.createElement("textarea");
			area.value = text;
			area.style.position = "fixed";
			area.style.opacity = "0";
			document.body.appendChild(area);
			area.select();
			const ok = document.execCommand("copy");
			area.remove();
			if (ok) {
				trackToolComplete();
			}
			return ok;
		} catch {
			return false;
		}
	}
}
