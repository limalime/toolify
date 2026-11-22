import { describe, expect, it } from "vitest";
import { AD_SLOTS, ADS_ENABLED, type AdSlotName } from "./ads";

const NAMES: AdSlotName[] = [
	"home_above_footer",
	"home_below_tools",
	"tool_below_tool",
	"tool_in_faq",
	"tool_sidebar_sticky",
];

describe("ad slots", () => {
	it("stays off until the adsense application is approved", () => {
		expect(ADS_ENABLED).toBe(false);
	});

	it("names every reserved placement", () => {
		expect(Object.keys(AD_SLOTS).sort()).toEqual([...NAMES].sort());
	});

	it("gives each placement a fixed box for later", () => {
		for (const name of NAMES) {
			expect(AD_SLOTS[name].className, name).toMatch(/min-h|h-\[/);
			expect(AD_SLOTS[name].format, name).not.toBe("");
		}
	});

	it("reserves a 160x600 rail that fits the 2xl gutter", () => {
		expect(AD_SLOTS.tool_sidebar_sticky.className).toContain("h-[600px]");
		expect(AD_SLOTS.tool_sidebar_sticky.className).toContain("w-40");
		// max-w-6xl is 1152px, so a 1536px viewport leaves 192px per
		// side. the rail plus its 24px gap has to stay inside that.
		expect(160 + 24).toBeLessThanOrEqual((1536 - 1152) / 2);
	});
});
