import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { OCEAN_Y, TOWER } from "../../../src/config.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { buildTower, towerPlacement, setBeamR, placeTower } from "../../../src/world/tower.js";

const { TS, TZ, T_D, T_VIS } = TOWER;
const mats = createMaterials({ createCanvas: stubCanvas, anisotropy: 1, paint: mulberry32(1) });

describe("towerPlacement", () => {
  it.each([0, 1, 2, 3])("matches the legacy formulas for i = %i", (i) => {
    const D = T_D[i];
    const sink = Math.max(0, 91.2e6 - T_VIS[i]);
    const placement = towerPlacement(i);
    expect(placement.position).toEqual([0, OCEAN_Y * (1 - TS) - sink, -D - TS * TZ]);
    expect(placement.beamR).toBe(Math.max(5e4, Math.min(6e5, D * 0.0035)));
    expect(placement.fogDensity).toBe((i >= 3 ? 0.6 : 0.8) / D);
    expect(placement.fogColor).toBe(i >= 3 ? 0xcfe9f4 : (i === 2 ? 0xa5c6dc : 0x7fa6c4));
  });

  it("clamps the beam radius at both ends", () => {
    expect(towerPlacement(0).beamR).toBe(4.9e5);
    expect(towerPlacement(3).beamR).toBe(5e4);
    expect(towerPlacement(1).beamR).toBe(1.4e5);
  });
});

describe("buildTower", () => {
  const tower = buildTower(mats);
  const count = (predicate) => { let n = 0; tower.group.children.forEach((c) => { if (predicate(c)) n++; }); return n; };

  it("scales the group by TS", () => {
    expect(tower.group.scale.toArray()).toEqual([TS, TS, TS]);
  });

  it("builds 8 tiers, 8 rings, 15 fins, 8 waterfalls", () => {
    expect(tower.rings).toHaveLength(8);
    expect(count((c) => c.geometry.type === "CylinderGeometry" && c.geometry.parameters.openEnded === false)).toBe(8);
    expect(count((c) => c.geometry instanceof THREE.BoxGeometry)).toBe(15);
    expect(count((c) => c.geometry instanceof THREE.PlaneGeometry && c.geometry.parameters.width === 16000)).toBe(8);
  });

  it("puts 8 * 90 points in the beacon", () => {
    expect(tower.beacon.geometry.attributes.position.count).toBe(8 * 90);
  });

  it("uses a shader beam of 3e7 height and anisotropy 8 on the tower texture", () => {
    expect(tower.beam.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(tower.beam.scale.y).toBe(3e7);
    expect(tower.spire.material.map.anisotropy).toBe(8);
    expect(tower.group.children).toContain(tower.spire);
  });
});

describe("setBeamR and placeTower", () => {
  it("setBeamR divides the radius by TS", () => {
    const tower = buildTower(mats);
    setBeamR(tower.beam, 8000);
    expect(tower.beam.scale.x).toBe(8000 / TS);
    expect(tower.beam.scale.z).toBe(8000 / TS);
  });

  it("placeTower applies the placement to group, beam, and fog", () => {
    const tower = buildTower(mats);
    const fog = new THREE.FogExp2(0, 0);
    placeTower(tower, fog, 2);
    const expected = towerPlacement(2);
    expect(tower.group.position.toArray()).toEqual(expected.position);
    expect(tower.beam.scale.x).toBe(expected.beamR / TS);
    expect(fog.density).toBe(expected.fogDensity);
    expect(fog.color.getHex()).toBe(expected.fogColor);
  });
});
