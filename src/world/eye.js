import * as THREE from "three";
import { TOP } from "../config.js";
import { EYE_VERT, EYE_FRAG } from "../gfx/shaders.js";

export function makeEye() {
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false,
    uniforms: { look: { value: new THREE.Vector3(0, 1, 0) }, dil: { value: 0.2 }, open: { value: 0 } },
    vertexShader: EYE_VERT,
    fragmentShader: EYE_FRAG,
  });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), material);
  eye.scale.setScalar(TOP.EYE_R); eye.frustumCulled = false; eye.visible = false;
  return eye;
}
