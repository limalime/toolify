import { describe, expect, it } from "vitest";
import { formatBytes, formatCompact } from "./format";

describe("formatBytes", () => {
	it("shows bytes under one KB", () => {
		expect(formatBytes(0)).toBe("0 B");
		expect(formatBytes(512)).toBe("512 B");
		expect(formatBytes(1023)).toBe("1023 B");
	});

	it("abbreviates to KB MB and GB", () => {
		expect(formatBytes(1024)).toBe("1 KB");
		expect(formatBytes(1536)).toBe("1.5 KB");
		expect(formatBytes(1048576)).toBe("1 MB");
		expect(formatBytes(1234567)).toBe("1.2 MB");
		expect(formatBytes(3221225472)).toBe("3 GB");
	});

	it("treats bad input as zero", () => {
		expect(formatBytes(-5)).toBe("0 B");
		expect(formatBytes(Number.NaN)).toBe("0 B");
	});
});

describe("formatCompact", () => {
	it("shows small counts as they are", () => {
		expect(formatCompact(0)).toBe("0");
		expect(formatCompact(42)).toBe("42");
		expect(formatCompact(999)).toBe("999");
	});

	it("abbreviates thousands and up", () => {
		expect(formatCompact(1500)).toBe("1.5K");
		expect(formatCompact(68810)).toBe("68.81K");
		expect(formatCompact(1200000)).toBe("1.2M");
		expect(formatCompact(2500000000)).toBe("2.5B");
	});

	it("treats bad input as zero", () => {
		expect(formatCompact(-1)).toBe("0");
		expect(formatCompact(Number.NaN)).toBe("0");
	});
});
