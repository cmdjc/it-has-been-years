import { describe, it, expect } from "vitest";
import { groundHeight } from "../../../src/game/ground.js";
import { TOP, PATH } from "../../../src/config.js";
import { boardShape } from "../../../src/game/board.js";

const BEAM = TOP.BEAM_Z;
const walk = (seg, z, extra = {}) => groundHeight({ phase: "walk", x: 0, z, seg, boardX: 0, ...extra });

describe("groundHeight top beam pad", () => {
  const at = (x, dz) => groundHeight({ phase: "top", x, z: BEAM + dz, seg: null, boardX: 0 });
  it("steps up inside the pad", () => {
    expect(at(0, -5.5)).toBe(0.24);
    expect(at(0, -5)).toBe(0.46);
    expect(at(0, -4)).toBe(0.68);
    expect(at(0, 3)).toBe(0.68);
  });
  it("is 0.02 on the surrounding plate and 0 outside", () => {
    expect(at(10, 0)).toBe(0.02);
    expect(at(0, 3.4)).toBe(0.02);
    expect(at(0, -6)).toBe(0.02);
    expect(at(41, 0)).toBe(0);
    expect(at(0, 41)).toBe(0);
  });
});

describe("groundHeight top phase", () => {
  const top = (x, z, boardX = 0) => groundHeight({ phase: "top", x, z, seg: null, boardX });
  it("follows the board", () => {
    expect(top(0, -698 - TOP.BOARD_L, 0.1)).toBeCloseTo(0.7, 12);
    expect(top(0, -698 - TOP.BOARD_L / 2, 0.2)).toBeCloseTo(0.6 + 0.2 * boardShape(TOP.BOARD_L / 2), 12);
    expect(top(0, -698)).toBe(0.6);
  });
  it("is 0.9 on the pool walkway", () => {
    expect(top(0, -500)).toBe(0.9);
    expect(top(2.5, -500)).toBe(0);
    expect(top(0, -620)).toBe(0);
    expect(top(0, -420)).toBe(0);
  });
  it("is 0 elsewhere", () => {
    expect(top(0, -100)).toBe(0);
    expect(top(1, -800)).toBe(0);
  });
});

describe("groundHeight by segment", () => {
  it("ramp", () => {
    expect(walk({ type: "ramp", z0: -100, L: 50, H: 0, y0: 2 }, -110)).toBeCloseTo(2 + PATH.SLOPE * 10, 12);
  });
  it("landing", () => {
    expect(walk({ type: "landing", z0: -100, L: 10, H: 0, y0: 7 }, -105)).toBe(7);
  });
  it("arch", () => {
    expect(walk({ type: "arch", z0: -100, L: 40, H: 5, y0: 0 }, -120)).toBeCloseTo(5, 12);
    expect(walk({ type: "arch", z0: -100, L: 40, H: 5, y0: 0 }, -110)).toBeCloseTo(5 * Math.sin(Math.PI / 4), 12);
  });
  describe("stairs", () => {
    const seg = { type: "stairs", z0: 0, L: 80, H: 0, y0: 0 };
    it("up flight", () => {
      expect(walk(seg, 0)).toBeCloseTo(0.22, 12);
      expect(walk(seg, -0.7)).toBeCloseTo(0.44, 12);
      expect(walk(seg, -16.7)).toBeCloseTo(24 * 0.22, 12);
    });
    it("top landing", () => {
      expect(walk(seg, -16.8)).toBeCloseTo(5.28, 12);
      expect(walk(seg, -16.8 - 11.9)).toBeCloseTo(5.28, 12);
    });
    it("down flight", () => {
      expect(walk(seg, -16.8 - 12)).toBeCloseTo(5.28 - 0.22, 12);
      expect(walk(seg, -16.8 - 12 - 0.7)).toBeCloseTo(5.28 - 0.44, 12);
    });
    it("past the end", () => {
      expect(walk(seg, -16.8 - 12 - 24 * 0.7 - 0.1)).toBe(0);
    });
  });
  it("is 0 for null seg or other types", () => {
    expect(walk(null, -50)).toBe(0);
    expect(walk({ type: "tunnel", z0: 0, L: 10, H: 3, y0: 4 }, -5)).toBe(0);
  });
});
