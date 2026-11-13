import { describe, it, expect } from "vitest";
import { mulberry32 } from "../../../src/core/rng.js";

describe("mulberry32", () => {
  it("matches the legacy sequence for the world seed", () => {
    const rand = mulberry32(20240607);
    expect([rand(), rand(), rand(), rand(), rand()]).toEqual([
      0.12406642525456846,
      0.9590097342152148,
      0.5566094832029194,
      0.4338171042036265,
      0.1294768718071282,
    ]);
  });

  it("keeps generators with the same seed independent and equal", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const firstA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(firstA);
    a();
    expect(b()).not.toBe(a());
  });

  it("stays within [0, 1)", () => {
    const rand = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
