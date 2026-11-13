import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { createKit } from "../../../src/gfx/geometry.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { groundHeight } from "../../../src/game/ground.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { createSegmentBuilder } from "../../../src/world/builder.js";
import { decor, struct } from "../../../src/world/structures.js";

const mats = createMaterials({ createCanvas: stubCanvas, anisotropy: 1, paint: mulberry32(1) });
const kit = createKit(mats);

const WALK_SPECS = [
  { mode: "walk", type: "walk", z0: 0, L: 60, H: 0 },
  { mode: "walk", type: "arch", z0: -60, L: 60, H: 8 },
  { mode: "walk", type: "stairs", z0: -120, L: 45.6, H: 0 },
  { mode: "walk", type: "tunnel", z0: -170, L: 48, H: 0 },
  { mode: "walk", type: "pool", z0: -220, L: 36, H: 0 },
  { mode: "walk", type: "colonnade", z0: -260, L: 56, H: 0 },
  { mode: "walk", type: "atrium", z0: -320, L: 70, H: 0 },
  { mode: "walk", type: "gate", z0: -400, L: 16, H: 0 },
];
const CLIMB_SPECS = [
  { mode: "climb", type: "ramp", z0: 0, L: 45, y0: 0 },
  { mode: "climb", type: "landing", z0: -45, L: 12, y0: 18.9 },
];

const meshes = (group) => {
  const found = [];
  group.traverse((o) => { if (o.isMesh) found.push(o); });
  return found;
};
const expectFinitePositions = (group) => {
  group.updateMatrixWorld(true);
  meshes(group).forEach((m) => {
    const p = new THREE.Vector3().setFromMatrixPosition(m.matrixWorld);
    expect([p.x, p.y, p.z].every(Number.isFinite)).toBe(true);
  });
};
const constantRng = (value) => {
  let calls = 0;
  const rng = () => { calls++; return value; };
  rng.count = () => calls;
  return rng;
};

describe("segment builder", () => {
  it.each([...WALK_SPECS, ...CLIMB_SPECS])("builds $mode $type with meshes and no NaN", (spec) => {
    const group = createSegmentBuilder(kit, mulberry32(1))(spec);
    expect(meshes(group).length).toBeGreaterThan(0);
    expectFinitePositions(group);
  });

  it("is deterministic for a spec sequence", () => {
    const run = () => {
      const rng = mulberry32(20240607);
      const build = createSegmentBuilder(kit, rng);
      const counts = [...WALK_SPECS, ...CLIMB_SPECS].map((spec) => meshes(build(spec)).length);
      return { counts, next: rng() };
    };
    expect(run()).toEqual(run());
  });

  it("consumes the world rng in legacy order", () => {
    /* constant rng 0.5. decor: n = 3 + floor(1.5) = 4 loops. Each loop calls side, t (floor(6) = 6),
       dist, k (type 6 branch: 1.4 + rand) and z = 5 calls; struct type 6 calls none. 1 + 4 * 5 = 21.
       Atrium skips decor (0). Struct type 0 calls r and h (2). Ramp and landing call none. */
    const count = (spec) => {
      const rng = constantRng(0.5);
      createSegmentBuilder(kit, rng)(spec);
      return rng.count();
    };
    expect(count(WALK_SPECS[0])).toBe(21);
    expect(count(WALK_SPECS[6])).toBe(0);
    expect(count(CLIMB_SPECS[0])).toBe(0);
    const rng = constantRng(0.5);
    struct(kit, rng, new THREE.Group(), 0, 0, 0, 1, 0);
    expect(rng.count()).toBe(2);
  });
});

describe("structures", () => {
  it.each([...Array(12).keys()])("struct type %i adds meshes with no NaN", (type) => {
    const group = new THREE.Group();
    struct(kit, mulberry32(3), group, type, 100, -200, type === 7 || type === 9 ? 5 : 1.5, 2);
    expect(meshes(group).length).toBeGreaterThan(0);
    expectFinitePositions(group);
  });

  it("decor adds meshes", () => {
    const group = new THREE.Group();
    decor(kit, mulberry32(5), group, -30, 60);
    expect(meshes(group).length).toBeGreaterThan(0);
    expectFinitePositions(group);
  });
});

describe("geometry agrees with physics", () => {
  const raycaster = new THREE.Raycaster();
  const hitY = (group, z) => {
    raycaster.set(new THREE.Vector3(2, 200, z), new THREE.Vector3(0, -1, 0));
    const [hit] = raycaster.intersectObject(group, true);
    return hit.point.y;
  };
  const check = (spec, phase, zs, tolerance) => {
    const group = createSegmentBuilder(kit, mulberry32(1))(spec);
    group.updateMatrixWorld(true);
    const seg = { type: spec.type, z0: spec.z0, L: spec.L, H: spec.H ?? 0, y0: spec.y0 ?? 0 };
    zs.forEach((z) => {
      const expected = groundHeight({ phase, x: 2, z, seg, boardX: 0 });
      expect(Math.abs(hitY(group, z) - expected), `z ${z}`).toBeLessThanOrEqual(tolerance);
    });
  };
  const sample = ({ z0, L }) => Array.from({ length: 20 }, (_, i) => z0 - (L * (i + 0.5)) / 20);

  it("deck", () => {
    const spec = { mode: "walk", type: "walk", z0: 0, L: 60, H: 0 };
    check(spec, "walk", sample(spec), 0.01);
  });

  it("arch", () => {
    const spec = { mode: "walk", type: "arch", z0: 0, L: 60, H: 8 };
    check(spec, "walk", sample(spec), 0.12);
  });

  it("stairs (tread centers)", () => {
    const run = 0.7;
    const treads = [...Array(24).keys()].map((i) => (i + 0.5) * run);
    const descent = [...Array(24).keys()].map((i) => 24 * run + 12 + (i + 0.5) * run);
    const spec = { mode: "walk", type: "stairs", z0: 0, L: 45.6, H: 0 };
    check(spec, "walk", [...treads, ...descent].filter((_, i) => i % 3 === 0).map((d) => -d), 0.01);
  });

  it("ramp", () => {
    const spec = { mode: "climb", type: "ramp", z0: 0, L: 45, y0: 0 };
    check(spec, "climb", sample(spec), 0.12);
  });

  it("landing", () => {
    const spec = { mode: "climb", type: "landing", z0: -45, L: 12, y0: 18.9 };
    check(spec, "climb", sample(spec), 0.01);
  });
});
