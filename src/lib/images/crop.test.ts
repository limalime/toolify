import { describe, expect, it } from "vitest";
import {
	clampSelection,
	constrainAspect,
	selectionFromCorners,
	selectionPixels,
} from "./crop";

describe("crop math", () => {
	it("orders drag corners", () => {
		const box = selectionFromCorners(0.8, 0.7, 0.2, 0.1);
		expect(box.x).toBeCloseTo(0.2, 5);
		expect(box.y).toBeCloseTo(0.1, 5);
		expect(box.width).toBeCloseTo(0.6, 5);
		expect(box.height).toBeCloseTo(0.6, 5);
	});

	it("clamps inside the image with a minimum size", () => {
		const clamped = clampSelection({ x: -0.5, y: 0.9, width: 2, height: 0.5 });
		expect(clamped.x).toBe(0);
		expect(clamped.y).toBeCloseTo(0.9, 5);
		expect(clamped.width).toBe(1);
		expect(clamped.height).toBeCloseTo(0.1, 5);
		expect(clampSelection({ x: 0.5, y: 0.5, width: 0, height: 0 })).toEqual({
			x: 0.5,
			y: 0.5,
			width: 0.02,
			height: 0.02,
		});
	});

	it("constrains to an aspect ratio around the center", () => {
		const square = constrainAspect(
			{ x: 0.1, y: 0.1, width: 0.8, height: 0.4 },
			1,
		);
		expect(square.width).toBeCloseTo(square.height, 5);
		expect(square.x + square.width).toBeLessThanOrEqual(1.0001);
	});

	it("converts fractions to whole pixels inside bounds", () => {
		expect(
			selectionPixels({ x: 0.25, y: 0.25, width: 0.5, height: 0.5 }, 800, 600),
		).toEqual({
			x: 200,
			y: 150,
			width: 400,
			height: 300,
		});
		const edge = selectionPixels(
			{ x: 0.9, y: 0.9, width: 0.5, height: 0.5 },
			100,
			100,
		);
		expect(edge.x + edge.width).toBeLessThanOrEqual(100);
		expect(edge.y + edge.height).toBeLessThanOrEqual(100);
	});
});
