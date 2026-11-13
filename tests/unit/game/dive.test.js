import { describe, it, expect } from "vitest";
import { Vector3 } from "three";
import { startDive, stepDive, wakeAtSea } from "../../../src/game/dive.js";
import { PATH, TOP, OCEAN_Y } from "../../../src/config.js";

const DT = 1 / 60;
const planetPos = new Vector3(0, -TOP.PLANET_R + OCEAN_Y, -1e7);
const skipAlt = 8e7;
const makeCtx = (yaw = 0) => ({ yaw, boardY: () => 0.6, skipAlt, planetPos });
const startZ = -(698 + TOP.BOARD_L - 10);

const run = (D, seconds, collected = [], ctx = makeCtx()) => {
  const n = Math.round(seconds / DT);
  let last;
  for (let i = 0; i < n; i++) {
    last = stepDive(D, DT, ctx);
    collected.push(...last.events.map((e) => ({ ...e, t: D.t })));
  }
  return last;
};
const count = (events, type) => events.filter((e) => e.type === type).length;

describe("startDive", () => {
  it("builds the legacy state", () => {
    const D = startDive({ x: 0.2, z: startZ, pitch: 0.1 });
    expect(D).toMatchObject({
      t: 0, x: 0.2, z: startZ, wy: 0, vy: 0, vz: 0, pitch: 0.1, phase: "run", tc: 0, tf: 0,
      stage: "fall1", skipped: false, eyeDone: false, rumbled: false, fin: false, t2: 0,
    });
    expect(D.eye.visible).toBe(false);
    expect(D.eye.open).toBe(0);
    expect(D.eye.dil).toBe(0.2);
    expect(D.eye.look.toArray()).toEqual([0, 1, 0]);
  });
});

describe("run and crouch", () => {
  it("reaches the tip in about 9.6/3.6 s then crouches", () => {
    const D = startDive({ x: 0, z: startZ, pitch: 0 });
    run(D, 9.6 / 3.6 - 0.1);
    expect(D.phase).toBe("run");
    run(D, 0.3);
    expect(D.phase).toBe("crouch");
    expect(D.z).toBeCloseTo(-(698 + TOP.BOARD_L) + 0.4, 9);
  });

  it("eases yaw to 0 and returns it", () => {
    const D = startDive({ x: 0.5, z: startZ, pitch: 0 });
    const r = stepDive(D, DT, makeCtx(1));
    expect(r.yaw).toBeCloseTo(1 - 1 * DT * 2.5, 12);
    expect(D.x).toBeCloseTo(0.5 - 0.5 * DT * 3, 12);
  });

  it("crouches 0.95 s then kicks and boings once", () => {
    const D = startDive({ x: 0, z: startZ, pitch: 0 });
    const events = [];
    run(D, 9.6 / 3.6 + 0.1, events);
    expect(D.phase).toBe("crouch");
    const tc = D.tc;
    run(D, 0.8, events);
    expect(D.phase).toBe("crouch");
    run(D, 0.2, events);
    expect(D.phase).toBe("fly");
    expect(D.tf - tc).toBeGreaterThanOrEqual(0.95);
    expect(events.filter((e) => e.type === "kick" || e.type === "boing")).toEqual([
      expect.objectContaining({ type: "kick", boardV: 6 }),
      expect.objectContaining({ type: "boing", a: 1 }),
    ]);
  });
});

describe("fly", () => {
  const flying = () => {
    const D = startDive({ x: 0, z: startZ, pitch: 0 });
    const events = [];
    while (D.phase !== "fly") run(D, DT, events);
    return { D, events };
  };

  it("is ballistic for 1.2 s then falls, skipping once at ft = 60 s", () => {
    const { D, events } = flying();
    expect(D.vy).toBe(7.5);
    expect(D.vz).toBe(-3.4);
    run(D, 1.1, events);
    run(D, 58.8, events);
    expect(D.stage).toBe("fall1");
    expect(count(events, "diveSkip")).toBe(0);
    run(D, 0.3, events);
    expect(D.stage).toBe("skip");
    run(D, 5, events);
    expect(count(events, "diveSkip")).toBe(1);
    const skip = events.find((e) => e.type === "diveSkip");
    expect(D.t - D.tf).toBeGreaterThan(60);
    expect(skip.t - D.tf).toBeLessThan(60.1);
  });

  it("emits wind with a capped gain during fall1", () => {
    const { D } = flying();
    run(D, 1.3);
    const r = stepDive(D, DT, makeCtx());
    const ft = D.t - D.tf;
    expect(r.events).toContainEqual({ type: "wind", gain: Math.min(0.16, 0.03 + 0.0023 * ft) });
  });

  it("reports an euler pose with roll while flying", () => {
    const { D } = flying();
    const { pose } = stepDive(D, DT, makeCtx());
    expect(pose.kind).toBe("euler");
    expect(pose.x).toBeCloseTo(D.x + PATH.CX, 9);
    expect(pose.roll).toBeCloseTo(Math.sin(D.t * 0.7) * 0.03, 12);
  });

  it("stays still except pitch and t in the skip stage", () => {
    const { D } = flying();
    run(D, 62);
    expect(D.stage).toBe("skip");
    const { wy, z } = D;
    run(D, 2);
    expect(D.wy).toBe(wy);
    expect(D.z).toBe(z);
  });
});

describe("wakeAtSea", () => {
  const woken = () => {
    const D = startDive({ x: 0, z: startZ, pitch: 0 });
    const events = [];
    while (D.stage !== "skip") run(D, DT, events);
    const wake = wakeAtSea(D, { skipAlt, planetPos });
    return { D, events, wake };
  };

  it("moves to fall2 and returns a quiet wind event", () => {
    const { D, wake } = woken();
    expect(wake).toEqual([{ type: "wind", gain: 0.02 }]);
    expect(D.stage).toBe("fall2");
    expect(D.t2).toBe(0);
    expect(D.wy).toBeCloseTo(OCEAN_Y - skipAlt + 3e7, 3);
    expect(D.z).toBeCloseTo(D.z1 - 1.1e7, 3);
    expect(D.eye.visible).toBe(true);
    expect(D.eye.open).toBe(0);
    expect(D.eye.dil).toBe(0.2);
    const ph = 1.1e7 / TOP.PLANET_R;
    const expected = planetPos.clone().add(new Vector3(0, Math.cos(ph), -Math.sin(ph)).multiplyScalar(TOP.PLANET_R - TOP.EYE_R));
    expect(D.eye.pos.distanceTo(expected)).toBeLessThan(1e-6);
  });

  it("looks at the eye and runs the eye timeline", () => {
    const { D } = woken();
    const events = [];
    const at = (t2) => { while (D.t2 < t2 - 1e-9) events.push(...run(D, DT).events); };
    expect(run(D, DT).pose.kind).toBe("look");
    expect(run(D, DT).pose.up).toEqual([0, 0, -1]);
    at(1.4);
    expect(count(events, "rumble")).toBe(0);
    at(1.6);
    at(3);
    expect(count(events, "rumble")).toBe(1);
    at(4.9);
    expect(D.eye.open).toBe(0);
    at(12);
    expect(D.eye.open).toBeCloseTo(0.5, 1);
    at(19.1);
    expect(D.eye.open).toBeCloseTo(1, 9);
    expect(D.eye.dil).toBeLessThan(1);
    at(24.1);
    expect(D.eye.dil).toBeCloseTo(1, 9);
    expect(count(events, "eyeDone")).toBe(0);
    at(28.1);
    at(30);
    expect(count(events, "eyeDone")).toBe(1);
    expect(count(events, "final")).toBe(1);
    expect(count(events, "rumble")).toBe(1);
  });

  it("puts the camera at the planet surface plus altitude and the eye look unit length", () => {
    const { D } = woken();
    const { pose } = run(D, 0.5);
    expect(pose.target).toBe(D.eye.pos);
    expect(D.eye.look.length()).toBeCloseTo(1, 9);
    expect(pose.position).toBe(D.camv);
  });
});
