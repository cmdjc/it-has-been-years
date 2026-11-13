import { describe, it, expect } from "vitest";
import { altitude, needsNear } from "../../../src/game/altitude.js";
import { SKIPS, OCEAN_Y } from "../../../src/config.js";

describe("altitude", () => {
  it("walk phase ignores player y", () => {
    expect(altitude({ phase: "walk", skipAlt: 0, playerY: 5 })).toEqual({
      alt: 0, space: 0, seaY: OCEAN_Y, worldY: -0, worldVisible: true, tNear: 1e6, seaLevel: 0.2,
    });
  });
  it("climb at each ALTS value", () => {
    SKIPS.ALTS.forEach((skipAlt) => {
      const r = altitude({ phase: "climb", skipAlt, playerY: 10 });
      const alt = skipAlt + 10;
      expect(r.alt).toBe(alt);
      expect(r.space).toBe(Math.max(0, Math.min(1, (alt - 30000) / 120000)));
      expect(r.seaY).toBe(OCEAN_Y - skipAlt);
      expect(r.worldY).toBe(-skipAlt);
      expect(r.worldVisible).toBe(alt < 40000);
      expect(r.tNear).toBe(Math.min(1e6, Math.max(5, alt * 0.25)));
      expect(r.seaLevel).toBeCloseTo(0.2 * (1 - r.space), 12);
    });
  });
  it("known climb values", () => {
    expect(altitude({ phase: "climb", skipAlt: 3000, playerY: 0 })).toMatchObject({ space: 0, worldVisible: true, tNear: 750, seaLevel: 0.2 });
    expect(altitude({ phase: "climb", skipAlt: 60000, playerY: 0 })).toMatchObject({ space: 0.25, worldVisible: false, tNear: 15000 });
    expect(altitude({ phase: "climb", skipAlt: 60000, playerY: 0 }).seaLevel).toBeCloseTo(0.15, 12);
    expect(altitude({ phase: "climb", skipAlt: 12e6, playerY: 0 })).toMatchObject({ space: 1, tNear: 1e6, seaLevel: 0 });
    expect(altitude({ phase: "climb", skipAlt: 0, playerY: 0 }).tNear).toBe(5);
  });
  it("top phase", () => {
    expect(altitude({ phase: "top", skipAlt: 84e6, playerY: 1 })).toMatchObject({ alt: 84e6 + 1, tNear: 500, space: 1, worldVisible: false });
  });
});

describe("needsNear", () => {
  it("applies a 2 percent tolerance", () => {
    expect(needsNear(100, 100)).toBe(false);
    expect(needsNear(101, 100)).toBe(false);
    expect(needsNear(103, 100)).toBe(true);
    expect(needsNear(97, 100)).toBe(true);
  });
});
