import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { PATH } from "../../../src/config.js";
import { mulberry32 } from "../../../src/core/rng.js";
import { createKit } from "../../../src/gfx/geometry.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { buildClimbBase, buildLanding, buildRamp, followWall, makeWall } from "../../../src/world/climb.js";
import { buildStart } from "../../../src/world/structures.js";

const mats = createMaterials({ createCanvas: stubCanvas, anisotropy: 1, paint: mulberry32(1) });
const kit = createKit(mats);

const countMeshes = (group) => {
  let n = 0;
  group.traverse((o) => { if (o.isMesh) n++; });
  return n;
};
const finite = (group) => {
  group.updateMatrixWorld(true);
  let ok = true;
  group.traverse((o) => { const p = new THREE.Vector3().setFromMatrixPosition(o.matrixWorld); ok = ok && [p.x, p.y, p.z].every(Number.isFinite); });
  return ok;
};

describe("climb pieces", () => {
  it("ramp and landing add meshes", () => {
    const ramp = new THREE.Group();
    buildRamp(kit, ramp, 0, 45);
    expect(countMeshes(ramp)).toBe(3);
    const landing = new THREE.Group();
    buildLanding(kit, landing, 0, 12);
    expect(countMeshes(landing)).toBe(6);
    expect(finite(ramp) && finite(landing)).toBe(true);
  });

  it("buildClimbBase returns a group with meshes", () => {
    const base = buildClimbBase(kit);
    expect(base.isGroup).toBe(true);
    expect(countMeshes(base)).toBeGreaterThan(0);
    expect(finite(base)).toBe(true);
  });

  it("buildStart returns a group with the platform and far field", () => {
    const rng = mulberry32(20240607);
    const start = buildStart(kit, rng);
    expect(start.isGroup).toBe(true);
    expect(countMeshes(start)).toBeGreaterThan(80);
    expect(finite(start)).toBe(true);
  });

  it("makeWall builds a repeating wall plane", () => {
    const { mesh, tex } = makeWall(mats);
    expect(mesh.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(mesh.geometry.parameters.width).toBe(120000);
    expect(tex.repeat.x).toBe(1875);
    expect(mesh.material.map).toBe(tex);
  });

  it("followWall tracks the camera with wrapped texture offsets", () => {
    const wall = makeWall(mats);
    followWall(wall, 10, -32);
    expect(wall.mesh.position.toArray()).toEqual([PATH.CX - 4.2, 10, -32]);
    expect(wall.tex.offset.x).toBeCloseTo(0.5);
    expect(wall.tex.offset.y).toBeCloseTo(10 / 64);
    followWall(wall, -10, 10);
    expect(wall.tex.offset.x).toBeCloseTo(((-10 / 64) % 1 + 1) % 1);
    expect(wall.tex.offset.y).toBeCloseTo(1 - 10 / 64);
  });
});
