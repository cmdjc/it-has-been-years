import { describe, it, expect, vi } from "vitest";
import * as THREE from "three";
import { OCEAN_Y } from "../../../src/config.js";
import { createKit, disposeGroup } from "../../../src/gfx/geometry.js";

const mats = {
  tileW: new THREE.MeshBasicMaterial(),
  tileA: new THREE.MeshBasicMaterial(),
  shadeMat: new THREE.MeshBasicMaterial(),
  unitPlane: new THREE.PlaneGeometry(1, 1),
};
const kit = createKit(mats);

const faceMaxUv = (geometry, face) => {
  const uv = geometry.attributes.uv;
  const values = [0, 1, 2, 3].map((i) => [uv.getX(face * 4 + i), uv.getY(face * 4 + i)]);
  return [Math.max(...values.map((v) => v[0])), Math.max(...values.map((v) => v[1]))];
};

describe("createKit", () => {
  it("exposes the materials", () => {
    expect(kit.mats).toBe(mats);
  });

  it("scales box UVs per face", () => {
    const mesh = kit.tbox(2, 3, 4, mats.tileW, 0.5);
    expect(mesh.material).toBe(mats.tileW);
    expect(faceMaxUv(mesh.geometry, 0)).toEqual([8, 6]);
    expect(faceMaxUv(mesh.geometry, 2)).toEqual([4, 8]);
    expect(faceMaxUv(mesh.geometry, 4)).toEqual([4, 6]);
  });

  it("scales cylinder UVs by circumference and height", () => {
    const mesh = kit.tcyl(1, 2, 3, 14, mats.tileA, 0.5);
    const base = new THREE.CylinderGeometry(1, 2, 3, 14).attributes.uv;
    const uv = mesh.geometry.attributes.uv;
    const circumference = Math.PI * 3;
    expect(mesh.material).toBe(mats.tileA);
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(base.getX(i) * circumference / 0.5, 4);
      expect(uv.getY(i)).toBeCloseTo(base.getY(i) * 3 / 0.5, 4);
    }
  });

  it("places slabs in the parent with default material and rs", () => {
    const parent = new THREE.Group();
    const mesh = kit.slab(parent, 2, 3, 4, 5, 6, 7);
    expect(mesh.parent).toBe(parent);
    expect(mesh.position.toArray()).toEqual([5, 6, 7]);
    expect(mesh.material).toBe(mats.tileW);
    const [u, v] = faceMaxUv(mesh.geometry, 0);
    expect(u).toBeCloseTo(4 / 0.6, 4);
    expect(v).toBeCloseTo(3 / 0.6, 4);
  });

  it("treats a falsy rs as 0.6 and keeps an explicit material", () => {
    const parent = new THREE.Group();
    const mesh = kit.slab(parent, 2, 3, 4, 0, 0, 0, mats.tileA, 0);
    expect(mesh.material).toBe(mats.tileA);
    const [u, v] = faceMaxUv(mesh.geometry, 0);
    expect(u).toBeCloseTo(4 / 0.6, 4);
    expect(v).toBeCloseTo(3 / 0.6, 4);
    const nullRs = kit.pillar(parent, 1, 2, 0, 0, 0, undefined, null);
    expect(nullRs.material).toBe(mats.tileW);
  });

  it("places pillars as 14-segment cylinders", () => {
    const parent = new THREE.Group();
    const mesh = kit.pillar(parent, 0.5, 4, 1, 2, 3);
    expect(mesh.parent).toBe(parent);
    expect(mesh.position.toArray()).toEqual([1, 2, 3]);
    expect(mesh.material).toBe(mats.tileW);
    expect(mesh.geometry.parameters.radialSegments).toBe(14);
    expect(mesh.geometry.parameters.radiusTop).toBe(0.5);
    expect(mesh.geometry.parameters.height).toBe(4);
  });

  it("lays shade on the ocean", () => {
    const parent = new THREE.Group();
    kit.shade(parent, 10, 20, 3, 4);
    const mesh = parent.children[0];
    expect(mesh.geometry).toBe(mats.unitPlane);
    expect(mesh.material).toBe(mats.shadeMat);
    expect(mesh.rotation.x).toBeCloseTo(-Math.PI / 2, 12);
    expect(mesh.scale.toArray()).toEqual([10, 20, 1]);
    expect(mesh.position.toArray()).toEqual([3, OCEAN_Y + 0.05, 4]);
  });
});

describe("disposeGroup", () => {
  it("disposes non-shared geometries only", () => {
    const own = new THREE.BoxGeometry(1, 1, 1);
    const nested = new THREE.BoxGeometry(1, 1, 1);
    const shared = new THREE.BoxGeometry(1, 1, 1);
    shared.userData.shared = true;
    const ownSpy = vi.spyOn(own, "dispose");
    const nestedSpy = vi.spyOn(nested, "dispose");
    const sharedSpy = vi.spyOn(shared, "dispose");
    const root = new THREE.Group();
    const child = new THREE.Group();
    root.add(new THREE.Mesh(own), new THREE.Mesh(shared), child);
    child.add(new THREE.Mesh(nested));
    disposeGroup(root);
    expect(ownSpy).toHaveBeenCalledTimes(1);
    expect(nestedSpy).toHaveBeenCalledTimes(1);
    expect(sharedSpy).not.toHaveBeenCalled();
  });
});
