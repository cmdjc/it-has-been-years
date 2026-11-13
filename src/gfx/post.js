import * as THREE from "three";
import { FS_VERT, BRIGHT_FRAG, BLUR_FRAG, FINAL_FRAG } from "./shaders.js";

const BLUR_PASSES = [[1.5, 0], [0, 1.5], [3.0, 0], [0, 3.0]];

export function createPost(gl, { time }) {
  const isWebGL2 = gl.capabilities.isWebGL2;
  const sceneOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true, stencilBuffer: false };
  const bloomOptions = { ...sceneOptions, depthBuffer: false };
  const target = isWebGL2 ? new THREE.WebGLMultisampleRenderTarget(4, 4, sceneOptions) : new THREE.WebGLRenderTarget(4, 4, sceneOptions);
  if (isWebGL2) target.samples = 4;
  const bloomA = new THREE.WebGLRenderTarget(4, 4, bloomOptions);
  const bloomB = new THREE.WebGLRenderTarget(4, 4, bloomOptions);
  const res = new THREE.Vector2(1, 1);

  const fsScene = new THREE.Scene();
  const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  fsScene.add(fsQuad);

  const brightMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null } }, vertexShader: FS_VERT, fragmentShader: BRIGHT_FRAG });
  const blurMat = new THREE.ShaderMaterial({ uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: FS_VERT, fragmentShader: BLUR_FRAG });
  const finalMat = new THREE.ShaderMaterial({
    uniforms: { tScene: { value: null }, tBloom: { value: null }, res: { value: res }, time, bloomI: { value: 0.5 } },
    vertexShader: FS_VERT,
    fragmentShader: FINAL_FRAG,
  });

  function pass(material, destination) {
    fsQuad.material = material;
    gl.setRenderTarget(destination);
    gl.render(fsScene, fsCam);
  }

  function resize(width, height) {
    const pixelRatio = gl.getPixelRatio();
    const w = Math.max(8, Math.floor(width * pixelRatio));
    const h = Math.max(8, Math.floor(height * pixelRatio));
    target.setSize(w, h);
    bloomA.setSize(Math.max(4, w >> 2), Math.max(4, h >> 2));
    bloomB.setSize(Math.max(4, w >> 2), Math.max(4, h >> 2));
    res.set(w, h);
  }

  function run(space) {
    brightMat.uniforms.tex.value = target.texture;
    pass(brightMat, bloomA);
    const texel = [1 / bloomA.width, 1 / bloomA.height];
    let [source, destination] = [bloomA, bloomB];
    for (const [dx, dy] of BLUR_PASSES) {
      blurMat.uniforms.tex.value = source.texture;
      blurMat.uniforms.dir.value.set(texel[0] * dx, texel[1] * dy);
      pass(blurMat, destination);
      [source, destination] = [destination, source];
    }
    finalMat.uniforms.tScene.value = target.texture;
    finalMat.uniforms.tBloom.value = source.texture;
    finalMat.uniforms.bloomI.value = 0.32 * (1 - 0.5 * space);
    pass(finalMat, null);
  }

  return { target, resize, run };
}
