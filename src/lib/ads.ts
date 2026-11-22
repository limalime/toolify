// reserved ad placements. ads stay off until the adsense application is
// approved, so each slot renders as a hidden marker. the sizes here are
// the boxes the slots will occupy when they switch on, which keeps a
// late loading ad from moving the page around it.
export type AdSlotName =
	| "home_above_footer"
	| "home_below_tools"
	| "tool_below_tool"
	| "tool_in_faq"
	| "tool_sidebar_sticky";

export interface AdSlotSpec {
	format: string;
	className: string;
}

export const ADS_ENABLED = false;

export const AD_SLOTS: Record<AdSlotName, AdSlotSpec> = {
	home_above_footer: {
		className: "min-h-[100px] md:min-h-[90px]",
		format: "responsive leaderboard, 728x90 or 320x100",
	},
	home_below_tools: {
		className: "min-h-[100px] md:min-h-[90px]",
		format: "responsive leaderboard, 728x90 or 320x100",
	},
	tool_below_tool: {
		className: "min-h-[100px] md:min-h-[90px]",
		format: "responsive leaderboard, 728x90 or 320x100",
	},
	tool_in_faq: {
		className: "min-h-[100px] md:min-h-[90px]",
		format: "responsive leaderboard, 728x90 or 320x100",
	},
	// the 160x600 rail sits in the page gutter at 2xl, where the
	// max-w-6xl column leaves 192px on each side. it never narrows the
	// tool itself.
	tool_sidebar_sticky: {
		className: "h-[600px] w-40",
		format: "sticky skyscraper, 160x600",
	},
};
