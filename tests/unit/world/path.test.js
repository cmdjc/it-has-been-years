import { describe, it, expect } from "vitest";
import { PATH } from "../../../src/config.js";
import { mulberry32 } from "../../../src/core/rng.js";
import { createPath } from "../../../src/world/path.js";

const makePath = () => {
  const specs = [];
  const removed = [];
  const rng = mulberry32(20240607);
  const path = createPath({
    rng,
    build: (spec) => {
      specs.push(spec);
      return { token: specs.length };
    },
    remove: (handle) => removed.push(handle),
  });
  return { path, specs, removed, rng };
};

const BLOCKED_EARLY = ["tunnel", "colonnade", "gate", "atrium", "stairs", "arch"];

describe("createPath walk mode", () => {
  it("starts with the intro list", () => {
    const { path, specs } = makePath();
    for (let i = 0; i < 6; i++) path.add();
    expect(specs.map((spec) => spec.type)).toEqual(PATH.INTRO);
  });

  it("never repeats a type after the intro and blocks hard types before segment 14", () => {
    const { path, specs } = makePath();
    for (let i = 0; i < 200; i++) path.add();
    const types = specs.map((spec) => spec.type);
    for (let i = 7; i < types.length; i++) expect(types[i]).not.toBe(types[i - 1]);
    types.slice(0, 14).forEach((type) => expect(BLOCKED_EARLY).not.toContain(type));
    expect(new Set(types.slice(14))).toContain("arch");
  });

  it("sizes segments by type and chains z", () => {
    const { path, specs } = makePath();
    for (let i = 0; i < 300; i++) path.add();
    const fixed = { stairs: 24 * 0.7 * 2 + 12, tunnel: 48, pool: 36, colonnade: 56, atrium: 70, gate: 16 };
    let z0 = 0;
    specs.forEach((spec) => {
      expect(spec.mode).toBe("walk");
      expect(spec.z0).toBe(z0);
      z0 -= spec.L;
      if (spec.type === "walk") {
        expect(spec.L).toBeGreaterThanOrEqual(50);
        expect(spec.L).toBeLessThan(110);
        expect(spec.H).toBe(0);
      } else if (spec.type === "arch") {
        expect(spec.L).toBeGreaterThanOrEqual(56);
        expect(spec.L).toBeLessThan(86);
        expect(spec.H).toBeGreaterThanOrEqual(5);
        expect(spec.H).toBeLessThan(10);
      } else {
        expect(spec.L).toBe(fixed[spec.type]);
        expect(spec.H).toBe(0);
      }
    });
    expect(new Set(specs.map((spec) => spec.type)).size).toBe(8);
    expect(path.state.genZ).toBe(z0);
    expect(path.state.segs).toHaveLength(300);
  });

  it("draws arch length before height", () => {
    const { path, specs } = makePath();
    for (let i = 0; i < 300; i++) path.add();
    const arch = specs.find((spec) => spec.type === "arch");
    const replay = mulberry32(20240607);
    const probe = createPath({ rng: replay, build: () => null, remove: () => {} });
    for (let i = 0; i < 300; i++) {
      probe.add();
      const last = probe.state.segs[probe.state.segs.length - 1];
      if (last.type === "arch") {
        expect(last.L).toBe(arch.L);
        expect(last.H).toBe(arch.H);
        break;
      }
    }
  });
});

describe("ensure and segAt", () => {
  it("generates ahead of the player and retires segments behind", () => {
    const { path, specs, removed } = makePath();
    path.ensure(0);
    expect(path.state.genZ).toBeLessThanOrEqual(-800);
    let playerZ = 0;
    for (let i = 0; i < 100; i++) {
      playerZ -= 25;
      path.ensure(playerZ);
      expect(path.state.genZ).toBeLessThanOrEqual(playerZ - 800);
      path.state.segs.forEach((seg) => expect(seg.z1).toBeLessThanOrEqual(playerZ + 320));
    }
    expect(removed.length).toBeGreaterThan(0);
    expect(removed.length + path.state.segs.length).toBe(specs.length);
    expect(removed[0]).toEqual({ token: 1 });
  });

  it("respects the max argument", () => {
    const { path, specs } = makePath();
    path.ensure(-5000, 3);
    expect(specs).toHaveLength(3);
  });

  it("finds segments with z0 inclusive and z1 exclusive", () => {
    const { path } = makePath();
    for (let i = 0; i < 3; i++) path.add();
    const [first, second] = path.state.segs;
    expect(path.segAt(first.z0)).toBe(first);
    expect(path.segAt(first.z1)).toBe(second);
    expect(path.segAt((first.z0 + first.z1) / 2)).toBe(first);
    expect(path.segAt(1)).toBeNull();
    expect(path.segAt(path.state.genZ)).toBeNull();
  });
});

describe("climb mode", () => {
  it("alternates landing and ramp with rising y0", () => {
    const { path, specs } = makePath();
    path.enterClimb();
    for (let i = 0; i < 4; i++) path.add();
    expect(specs.map((spec) => [spec.mode, spec.type, spec.L, spec.y0])).toEqual([
      ["climb", "landing", 24, 0],
      ["climb", "ramp", 45, 0],
      ["climb", "landing", 12, 18.9],
      ["climb", "ramp", 45, 18.9],
    ]);
    expect(specs.map((spec) => spec.z0)).toEqual([24, 0, -45, -57]);
    expect(path.state.climbY).toBeCloseTo(37.8, 10);
  });

  it("clears existing segments on entry", () => {
    const { path, removed } = makePath();
    for (let i = 0; i < 4; i++) path.add();
    path.enterClimb();
    expect(removed).toHaveLength(4);
    expect(path.state).toMatchObject({ mode: "climb", segCount: 0, lastType: "", genZ: 24, climbY: 0 });
    expect(path.state.segs).toHaveLength(0);
  });

  it("regenerates just behind the landing point and starts with a ramp", () => {
    const { path, specs, removed } = makePath();
    path.enterClimb();
    for (let i = 0; i < 4; i++) path.add();
    const climbYBefore = path.state.climbY;
    const handled = specs.length;
    path.regenerate(-300, 500);
    expect(removed).toHaveLength(4);
    expect(path.state.climbY).toBeGreaterThan(climbYBefore);
    const fresh = specs.slice(handled);
    expect(fresh[0]).toMatchObject({ mode: "climb", type: "ramp", z0: -240 });
    expect(fresh[0].y0).toBeCloseTo(climbYBefore + PATH.SLOPE * 500 * (45 / 57), 10);
    expect(path.state.segs.length).toBeGreaterThan(0);
  });

  it("regenerates in walk mode without changing climbY", () => {
    const { path, specs } = makePath();
    path.regenerate(-1000, 700);
    expect(path.state.climbY).toBe(0);
    expect(specs[0].z0).toBe(-940);
    expect(specs[0].mode).toBe("walk");
    expect(path.state.genZ).toBeLessThanOrEqual(-1000 - 800);
  });
});

describe("clear", () => {
  it("removes every segment from the back", () => {
    const { path, removed } = makePath();
    for (let i = 0; i < 3; i++) path.add();
    path.clear();
    expect(removed.map((handle) => handle.token)).toEqual([3, 2, 1]);
    expect(path.state.segs).toHaveLength(0);
  });
});
