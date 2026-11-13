import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { createMaterials } from "../../../src/gfx/materials.js";

const build = () => createMaterials({ createCanvas: (w, h) => stubCanvas(w, h), anisotropy: 8, paint: mulberry32(1) });

describe("createMaterials", () => {
  it("exposes the shared uniforms", () => {
    const mats = build();
    expect(mats.uniforms.time).toEqual({ value: 0 });
    expect(mats.uniforms.space).toEqual({ value: 0 });
    expect(mats.uniforms.planetC.value).toBeInstanceOf(THREE.Vector3);
    expect(mats.uniforms.sunDir.value.length()).toBeCloseTo(1, 12);
    const expected = new THREE.Vector3(0.35, 0.62, 0.7).normalize();
    expect(mats.uniforms.sunDir.value.distanceTo(expected)).toBeCloseTo(0, 12);
  });

  it("builds the shader materials on the shared uniforms", () => {
    const mats = build();
    expect(mats.skyMat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mats.skyMat.side).toBe(THREE.BackSide);
    expect(mats.skyMat.depthWrite).toBe(false);
    expect(mats.skyMat.fog).toBe(false);
    expect(mats.skyMat.uniforms.sunDir).toBe(mats.uniforms.sunDir);
    expect(mats.skyMat.uniforms.space).toBe(mats.uniforms.space);
    expect(mats.planetMat.fog).toBe(false);
    expect(mats.planetMat.uniforms.sunDir).toBe(mats.uniforms.sunDir);
    expect(mats.planetMat.uniforms.uC).toBe(mats.uniforms.planetC);
  });

  it("makes distinct water materials that share the time uniform", () => {
    const mats = build();
    const first = mats.water();
    const second = mats.water();
    expect(first).not.toBe(second);
    expect(first).not.toBe(mats.poolWater);
    expect(first.fog).toBe(false);
    expect(first.uniforms.time).toBe(mats.uniforms.time);
    expect(second.uniforms.time).toBe(mats.uniforms.time);
    expect(first.uniforms.sunDir).toBe(mats.uniforms.sunDir);
    expect(first.uniforms.space).toBe(mats.uniforms.space);
    expect(Object.keys(first.uniforms).sort()).toEqual(["space", "sunDir", "time"]);
    expect(mats.poolWater).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mats.poolWater.uniforms.time).toBe(mats.uniforms.time);
  });

  it("builds the tile materials", () => {
    const mats = build();
    [mats.tileW, mats.tileA].forEach((mat) => {
      expect(mat).toBeInstanceOf(THREE.MeshLambertMaterial);
      expect(mat.map).toBeInstanceOf(THREE.CanvasTexture);
      expect(mat.map.anisotropy).toBe(8);
    });
    expect(mats.tileW.map).not.toBe(mats.tileA.map);
  });

  it("keeps the legacy colors and opacities", () => {
    const mats = build();
    expect(mats.lightMat).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(mats.lightMat.color.getHex()).toBe(0xffffff);
    expect(mats.chromeMat.color.getHex()).toBe(0xdfe9ee);
    expect(mats.doorWarm.color.getHex()).toBe(0xffe6b0);
    expect(mats.buoyW.color.getHex()).toBe(0xffffff);
    expect(mats.buoyA.color.getHex()).toBe(0x62d3dc);
    expect(mats.causticMat.blending).toBe(THREE.AdditiveBlending);
    expect(mats.causticMat.opacity).toBe(0.55);
    expect(mats.causticMat.transparent).toBe(true);
    expect(mats.causticMat.depthWrite).toBe(false);
    expect(mats.causticTex.repeat.toArray()).toEqual([3, 3]);
    expect(mats.shadeMat.opacity).toBe(0.3);
    expect(mats.shadeMat.transparent).toBe(true);
    expect(mats.shadeMat.depthWrite).toBe(false);
    expect(mats.shadeMat.map.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(mats.shadeMat.map.wrapT).toBe(THREE.ClampToEdgeWrapping);
    expect(mats.stairMat.map).toBeInstanceOf(THREE.CanvasTexture);
  });

  it("marks the shared geometries", () => {
    const mats = build();
    expect(mats.unitPlane).toBeInstanceOf(THREE.PlaneGeometry);
    expect(mats.unitPlane.userData.shared).toBe(true);
    expect(mats.buoyGeo).toBeInstanceOf(THREE.SphereGeometry);
    expect(mats.buoyGeo.userData.shared).toBe(true);
  });

  it("paints from the injected stream", () => {
    const first = build().tileW.map.image.calls;
    const second = build().tileW.map.image.calls;
    expect(first).toEqual(second);
  });

  it("binds tex to the environment", () => {
    const mats = build();
    const texture = mats.tex(16, 16, () => {}, 2, 3);
    expect(texture.anisotropy).toBe(8);
    expect(texture.repeat.toArray()).toEqual([2, 3]);
  });
});
