import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { OCEAN_Y, PATH, SKIPS, TOP, TOWER } from "../../../src/config.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { buildTower } from "../../../src/world/tower.js";
import { makePlanet, stageTop } from "../../../src/world/planet.js";

const mats = createMaterials({ createCanvas: stubCanvas, anisotropy: 1, paint: mulberry32(1) });

describe("makePlanet", () => {
  it("is a hidden, unculled sphere using the planet material", () => {
    const planet = makePlanet(mats);
    expect(planet.material).toBe(mats.planetMat);
    expect(planet.geometry.parameters.radius).toBe(TOP.PLANET_R);
    expect(planet.visible).toBe(false);
    expect(planet.frustumCulled).toBe(false);
  });
});

describe("stageTop", () => {
  const tower = buildTower(mats);
  const planet = makePlanet(mats);
  const seaFar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const fog = new THREE.FogExp2(0, 0);
  const tScene = new THREE.Scene();
  const pivots = stageTop({ tower, planet, seaFar, fog, tScene, mats });

  it("adds six tower clones on pivots", () => {
    expect(pivots).toHaveLength(6);
    pivots.forEach((pivot) => expect(tScene.children).toContain(pivot));
  });

  it("shows the planet, hides the far sea, and copies planetC", () => {
    const cz = -700 + 1.0036e6;
    expect(planet.visible).toBe(true);
    expect(seaFar.visible).toBe(false);
    expect(planet.position.toArray()).toEqual([PATH.CX, OCEAN_Y - SKIPS.ALTS[4] - TOP.PLANET_R, cz]);
    expect(mats.uniforms.planetC.value.toArray()).toEqual(planet.position.toArray());
    expect(tower.group.position.toArray()).toEqual([PATH.CX, -TOWER.TS * (OCEAN_Y + 10.5e6) - 0.05, cz - TOWER.TS * TOWER.TZ]);
  });

  it("applies the clone beam rule and hides spire, beacon, and last ring on the main tower", () => {
    const scales = [6, 7, 5, 6, 7, 5];
    pivots.forEach((pivot, index) => {
      const clone = pivot.children[0];
      expect(clone.scale.x).toBe(scales[index]);
      const beam = clone.children.find((child) => child.material === tower.beam.material);
      expect(beam.scale.x).toBe(1.2e5 / scales[index]);
      expect(beam.scale.z).toBe(1.2e5 / scales[index]);
    });
    expect(tower.group.visible).toBe(true);
    expect(tower.beam.visible).toBe(true);
    expect(tower.beam.scale.x).toBe(1e4 / TOWER.TS);
    expect(tower.spire.visible).toBe(false);
    expect(tower.beacon.visible).toBe(false);
    expect(tower.rings[7].visible).toBe(false);
    expect(fog.color.getHex()).toBe(0x0c1c2e);
    expect(fog.density).toBe(6e-9);
  });
});
