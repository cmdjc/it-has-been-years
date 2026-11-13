import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { TOP } from "../../../src/config.js";
import { makeEye } from "../../../src/world/eye.js";

describe("makeEye", () => {
  it("builds a hidden, unculled shader sphere with look, dil, and open uniforms", () => {
    const eye = makeEye();
    const { uniforms } = eye.material;
    expect(eye.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(uniforms.open.value).toBe(0);
    expect(uniforms.dil.value).toBe(0.2);
    expect(uniforms.look.value.toArray()).toEqual([0, 1, 0]);
    expect(eye.scale.x).toBe(TOP.EYE_R);
    expect(eye.visible).toBe(false);
    expect(eye.frustumCulled).toBe(false);
  });
});
