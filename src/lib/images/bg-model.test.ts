import { describe, expect, it } from "vitest";
import { BG_MODEL } from "@/lib/images/bg-model";

describe("BG_MODEL", () => {
	it("keeps the exact r2 file size", () => {
		expect(BG_MODEL.bytes).toBe(88_117_930);
		expect(BG_MODEL.mb).toBe(84);
	});

	it("points at the versioned ormbg model", () => {
		expect(BG_MODEL.id).toBe("ormbg/1.0.0");
	});
});
