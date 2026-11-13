import { describe, it, expect } from "vitest";
import { clamp, smooth, ramp, wrapPi } from "../../../src/core/math.js";

describe("clamp", () => {
  it("limits to the range", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe("smooth", () => {
  it("is t*t*(3-2t)", () => {
    expect(smooth(0)).toBe(0);
    expect(smooth(1)).toBe(1);
    expect(smooth(0.5)).toBe(0.5);
    expect(smooth(0.25)).toBeCloseTo(0.15625, 12);
  });
});

describe("ramp", () => {
  it("maps [a, b] to [0, 1] and clamps outside", () => {
    expect(ramp(5, 0, 10)).toBe(0.5);
    expect(ramp(-1, 0, 10)).toBe(0);
    expect(ramp(20, 0, 10)).toBe(1);
  });
});

describe("wrapPi", () => {
  it("wraps angles into [-PI, PI)", () => {
    expect(wrapPi(0)).toBe(0);
    expect(wrapPi(2 * Math.PI + 0.5)).toBeCloseTo(0.5, 12);
    expect(wrapPi(-2 * Math.PI - 0.5)).toBeCloseTo(-0.5, 12);
    expect(wrapPi(Math.PI)).toBeCloseTo(-Math.PI, 12);
    expect(wrapPi(7)).toBeCloseTo(7 - 2 * Math.PI, 12);
  });
});
