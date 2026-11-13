import * as THREE from "three";
import { FOV, OCEAN_Y, SUN_DIR } from "../config.js";
import { createPost } from "./post.js";

const MAX_PIXEL_RATIO = 1.6;
const MIN_PIXEL_RATIO = 0.8;
const PIXEL_RATIO_STEP = 0.75;
const MIN_FPS = 38;
const WINDOW_SECONDS = 2.5;
const MAX_TRIES = 3;

export const createQuality = (devicePixelRatio) => ({
  pr: Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO), acc: 0, n: 0, tries: 0,
});

export function adapt(q, raw) {
  if (q.tries >= MAX_TRIES) return null;
  q.acc += raw;
  q.n++;
  if (q.acc <= WINDOW_SECONDS) return null;
  let lowered = null;
  if (q.n / q.acc < MIN_FPS && q.pr > MIN_PIXEL_RATIO) {
    q.pr = Math.max(MIN_PIXEL_RATIO, q.pr * PIXEL_RATIO_STEP);
    q.tries++;
    lowered = q.pr;
  } else q.tries = MAX_TRIES;
  q.acc = 0;
  q.n = 0;
  return lowered;
}

export function createView({ gl, mats, win }) {
  gl.setPixelRatio(Math.min(win.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  gl.setSize(win.innerWidth, win.innerHeight);
  gl.autoClear = false;
  const post = createPost(gl, { time: mats.uniforms.time });
  post.resize(win.innerWidth, win.innerHeight);

  const aspect = win.innerWidth / win.innerHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, aspect, 0.15, 60000);
  camera.rotation.order = "YXZ";
  const tScene = new THREE.Scene();
  const tCam = new THREE.PerspectiveCamera(FOV, aspect, 1e6, 3e8);

  const sun = new THREE.Vector3(...SUN_DIR).normalize();
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x86dce3, 0.62));
  const sunNear = new THREE.DirectionalLight(0xfff4e0, 0.92);
  sunNear.position.copy(sun).multiplyScalar(100);
  scene.add(sunNear);
  tScene.add(new THREE.HemisphereLight(0xcfeaff, 0x9be4ea, 0.75));
  const sunFar = new THREE.DirectionalLight(0xfff4e0, 0.95);
  sunFar.position.copy(sun).multiplyScalar(1e6);
  tScene.add(sunFar);
  tScene.fog = new THREE.FogExp2(0xcfe9f4, 5e-8);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(5e7, 32, 16), mats.skyMat);
  sky.renderOrder = -10;
  tScene.add(sky);

  const sea = (size) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mats.water());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = OCEAN_Y;
    return mesh;
  };
  const seaNear = sea(80000);
  scene.add(seaNear);
  const seaFar = sea(8e8);
  tScene.add(seaFar);

  function renderFar(phase) {
    if (phase !== "top") {
      gl.render(tScene, tCam);
      return;
    }
    const { near, far } = tCam;
    tCam.near = 1e5; tCam.far = 3e8; tCam.updateProjectionMatrix();
    gl.render(tScene, tCam);
    gl.clearDepth();
    tCam.near = 2; tCam.far = 2.5e5; tCam.updateProjectionMatrix();
    gl.render(tScene, tCam);
    tCam.near = near; tCam.far = far; tCam.updateProjectionMatrix();
  }

  function render(phase, space) {
    tCam.position.copy(camera.position);
    tCam.quaternion.copy(camera.quaternion);
    sky.position.copy(camera.position);
    for (const mesh of [seaNear, seaFar]) {
      mesh.position.x = camera.position.x;
      mesh.position.z = camera.position.z;
    }
    gl.setRenderTarget(post.target);
    gl.clear();
    renderFar(phase);
    gl.clearDepth();
    gl.render(scene, camera);
    post.run(space);
  }

  function resize() {
    camera.aspect = tCam.aspect = win.innerWidth / win.innerHeight;
    camera.updateProjectionMatrix();
    tCam.updateProjectionMatrix();
    gl.setSize(win.innerWidth, win.innerHeight);
    post.resize(win.innerWidth, win.innerHeight);
  }

  function setPixelRatio(pixelRatio) {
    gl.setPixelRatio(pixelRatio);
    gl.setSize(win.innerWidth, win.innerHeight);
    post.resize(win.innerWidth, win.innerHeight);
  }

  return { scene, camera, tScene, tCam, sky, seaNear, seaFar, post, render, resize, setPixelRatio };
}
