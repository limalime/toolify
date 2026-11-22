import { describe, expect, it } from "vitest";
import { isAnalyticsDisabled } from "./analytics";

describe("analytics kill list", () => {
	it("disables analytics on mnemonic pages only", () => {
		expect(isAnalyticsDisabled("mnemonic-generator")).toBe(true);
		expect(isAnalyticsDisabled("uuid-generator")).toBe(false);
		expect(isAnalyticsDisabled("image-converter")).toBe(false);
	});
});
