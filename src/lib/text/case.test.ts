import { describe, expect, it } from "vitest";
import { CASE_STYLES, convertCase } from "./case";

describe("case converter", () => {
	it("converts the simple cases", () => {
		expect(convertCase("Hello World", "upper")).toBe("HELLO WORLD");
		expect(convertCase("Hello World", "lower")).toBe("hello world");
		expect(convertCase("hello world", "title")).toBe("Hello World");
	});

	it("capitalizes sentences", () => {
		expect(convertCase("hello. how are you? fine!", "sentence")).toBe(
			"Hello. How are you? Fine!",
		);
	});

	it("builds programmer cases from mixed input", () => {
		expect(convertCase("hello world_test", "camel")).toBe("helloWorldTest");
		expect(convertCase("helloWorldTest", "snake")).toBe("hello_world_test");
		expect(convertCase("helloWorldTest", "kebab")).toBe("hello-world-test");
		expect(convertCase("  spaced   out  ", "camel")).toBe("spacedOut");
	});

	it("ships seven styles", () => {
		expect(CASE_STYLES).toHaveLength(7);
	});
});
