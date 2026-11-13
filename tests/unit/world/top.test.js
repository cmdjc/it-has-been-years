import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { createKit } from "../../../src/gfx/geometry.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { groundHeight } from "../../../src/game/ground.js";
import { TOP } from "../../../src/config.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { buildTop, bendBoard, placeFarSlab } from "../../../src/world/top.js";

const mats = createMaterials({ createCanvas: stubCanvas, anisotropy: 1, paint: mulberry32(1) });
const kit = createKit(mats);
const top = buildTop(kit, mulberry32(7));
const raycaster = new THREE.Raycaster();

const downHits = (object, x, z) => {
  raycaster.set(new THREE.Vector3(x, 50, z), new THREE.Vector3(0, -1, 0));
  return raycaster.intersectObject(object, true).map((hit) => hit.point.y);
};
const hitsHeight = (object, x, z, height) => downHits(object, x, z).some((y) => Math.abs(y - height) < 0.01);

describe("buildTop", () => {
  it("returns group, beamPad, farSlab, and 96 board parts", () => {
    expect(top.boardParts).toHaveLength(96);
    expect(top.group).toBeInstanceOf(THREE.Group);
    expect(top.beamPad.position.z).toBe(TOP.BEAM_Z);
    expect(top.farSlab.position.toArray()).toEqual([0, -2, 80000]);
  });

  it("matches the ground function along the bent board", () => {
    bendBoard(top.boardParts, -0.5);
    top.group.updateMatrixWorld(true);
    const len = TOP.BOARD_L / 48;
    for (let i = 0; i < 48; i++) {
      const z = -698 - (i + 0.5) * len;
      const expected = groundHeight({ phase: "top", x: 0, z, boardX: -0.5 });
      expect(hitsHeight(top.boardParts[2 * i].m, 0, z, expected)).toBe(true);
    }
  });

  it("bendBoard sets y = y0 + boardX * shape", () => {
    bendBoard(top.boardParts, 0);
    top.boardParts.forEach((part) => expect(part.m.position.y).toBe(part.y0));
  });

  it("matches the ground function on the pool walkway", () => {
    top.group.updateMatrixWorld(true);
    for (const z of [-619, -560, -520, -480, -421]) {
      expect(groundHeight({ phase: "top", x: 1.5, z, boardX: 0 })).toBe(0.9);
      expect(hitsHeight(top.group, 1.5, z, 0.9)).toBe(true);
    }
  });

  it("matches the ground function on the beam pad steps", () => {
    top.beamPad.updateMatrixWorld(true);
    for (const [dz, height] of [[-5.6, 0.24], [-4.8, 0.46], [-2, 0.68]]) {
      expect(groundHeight({ phase: "top", x: 0, z: TOP.BEAM_Z + dz })).toBe(height);
      expect(hitsHeight(top.beamPad, 0, TOP.BEAM_Z + dz, height)).toBe(true);
    }
  });
});

describe("placeFarSlab", () => {
  it("follows the player only past z = 50000", () => {
    const slab = { position: { z: 80000 } };
    placeFarSlab(slab, 0);
    expect(slab.position.z).toBe(80000);
    placeFarSlab(slab, 60000);
    expect(slab.position.z).toBe(60000);
    placeFarSlab(slab, 70000);
    expect(slab.position.z).toBe(60000);
    placeFarSlab(slab, 60000 + 20000);
    expect(slab.position.z).toBe(80001);
    placeFarSlab(slab, 100);
    expect(slab.position.z).toBe(80000);
  });
});
