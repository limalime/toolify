// pages where analytics must never fire, currently the mnemonic
// pages only. the phase 10 loader reads this list before firing
// anything, and the tool shell exposes it as a data attribute.
const ANALYTICS_DISABLED = new Set(["mnemonic-generator"]);

export function isAnalyticsDisabled(slug: string): boolean {
	return ANALYTICS_DISABLED.has(slug);
}
