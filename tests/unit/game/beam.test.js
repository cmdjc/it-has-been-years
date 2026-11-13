import { describe, it, expect } from "vitest";
import { startBeam, stepBeam } from "../../../src/game/beam.js";
import { PATH } from "../../../src/config.js";

const at = { x: 0, y: 0, z: 1e6, yaw: 0.3 };

describe("beam", () => {
  it("starts from the given pitch", () => {
    expect(startBeam(0.2)).toEqual({ t: 0, pitch: 0.2, fin: false });
  });

  it("rises with the legacy height formula", () => {
    const B = startBeam(0);
    const { pose } = stepBeam(B, 0, at);
    expect(pose).toEqual({ kind: "euler", x: PATH.CX, y: 1.62, z: 1e6, pitch: 0, yaw: 0.3, roll: 0 });
    stepBeam(B, 2, at);
    expect(stepBeam(B, 0, at).pose.y).toBeCloseTo(1.62 + 4e5 * (Math.exp(1) - 1), 3);
    stepBeam(B, 8, at);
    expect(stepBeam(B, 0, at).pose.y).toBeCloseTo(1.62 + 4e5 * (Math.exp(5) - 1), 1);
  });

  it("emits final once after 10 s and keeps rising", () => {
    const B = startBeam(0);
    let finals = 0;
    let y = 0;
    for (let i = 0; i < 60 * 12; i++) {
      const r = stepBeam(B, 1 / 60, at);
      finals += r.events.filter((e) => e.type === "final").length;
      expect(r.pose.y).toBeGreaterThanOrEqual(y);
      y = r.pose.y;
    }
    expect(finals).toBe(1);
  });

  it("does not emit final at exactly 10 s", () => {
    const B = startBeam(0);
    expect(stepBeam(B, 10, at).events).toEqual([]);
    expect(stepBeam(B, 0.01, at).events).toEqual([{ type: "final" }]);
  });

  it("eases pitch toward 1.45", () => {
    const B = startBeam(0);
    for (let i = 0; i < 60 * 20; i++) stepBeam(B, 1 / 60, at);
    expect(B.pitch).toBeCloseTo(1.45, 3);
  });
});
