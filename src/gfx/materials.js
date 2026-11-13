import * as THREE from "three";
import { SUN_DIR } from "../config.js";
import { SKY_VERT, SKY_FRAG, WATER_VERT, WATER_FRAG, PLANET_VERT, PLANET_FRAG } from "./shaders.js";
import {
  TEXTURE_SIZES,
  canvasTex,
  tilePainter,
  causticPainter,
  shadePainter,
  stairPainter,
} from "./textures.js";

export function createMaterials({ createCanvas, anisotropy, paint }) {
  const env = { createCanvas, anisotropy };
  const tex = (w, h, draw, rx, ry) => canvasTex(env, w, h, draw, rx, ry);
  const sized = (name, draw, rx, ry) => tex(TEXTURE_SIZES[name].w, TEXTURE_SIZES[name].h, draw, rx, ry);

  const uniforms = {
    time: { value: 0 },
    sunDir: { value: new THREE.Vector3(...SUN_DIR).normalize() },
    space: { value: 0 },
    planetC: { value: new THREE.Vector3() },
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: uniforms.sunDir, space: uniforms.space },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
  });

  const water = () => new THREE.ShaderMaterial({
    fog: false,
    uniforms: { time: uniforms.time, sunDir: uniforms.sunDir, space: uniforms.space },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
  });

  const planetMat = new THREE.ShaderMaterial({
    fog: false, uniforms: { sunDir: uniforms.sunDir, uC: uniforms.planetC },
    vertexShader: PLANET_VERT,
    fragmentShader: PLANET_FRAG,
  });

  const tileW = new THREE.MeshLambertMaterial({ map: sized("tile", tilePainter([240, 247, 247], "#a9d3d8", 0.05, paint)) });
  const tileA = new THREE.MeshLambertMaterial({ map: sized("tile", tilePainter([120, 214, 222], "#bdf1f4", 0.07, paint)) });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const chromeMat = new THREE.MeshLambertMaterial({ color: 0xdfe9ee });
  const poolWater = water();
  const causticTex = sized("caustic", causticPainter(paint), 3, 3);
  const causticMat = new THREE.MeshBasicMaterial({ map: causticTex, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.55, depthWrite: false });
  const shadeTex = sized("shade", shadePainter(), 1, 1);
  shadeTex.wrapS = shadeTex.wrapT = THREE.ClampToEdgeWrapping;
  const shadeMat = new THREE.MeshBasicMaterial({ map: shadeTex, transparent: true, opacity: 0.3, depthWrite: false });
  const unitPlane = new THREE.PlaneGeometry(1, 1); unitPlane.userData.shared = true;

  const buoyGeo = new THREE.SphereGeometry(1, 10, 8); buoyGeo.userData.shared = true;
  const buoyW = new THREE.MeshLambertMaterial({ color: 0xffffff }), buoyA = new THREE.MeshLambertMaterial({ color: 0x62d3dc });

  const stairMat = new THREE.MeshLambertMaterial({ map: sized("stair", stairPainter(), 1, 1) });
  const doorWarm = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });

  return {
    paint, uniforms, tex, skyMat, water, poolWater, planetMat, tileW, tileA, lightMat, chromeMat,
    causticTex, causticMat, shadeMat, unitPlane, buoyGeo, buoyW, buoyA, stairMat, doorWarm,
  };
}
