import "./ui/style.css";
import * as THREE from "three";
import { WORLD_SEED } from "./config.js";
import { mulberry32 } from "./core/rng.js";
import { createMaterials } from "./gfx/materials.js";
import { createKit, disposeGroup } from "./gfx/geometry.js";
import { createView } from "./gfx/renderer.js";
import { buildStart } from "./world/structures.js";
import { createPath } from "./world/path.js";
import { createSegmentBuilder } from "./world/builder.js";
import { buildTower, placeTower } from "./world/tower.js";

const PAINT_SEED = 1;
const LOOKAHEAD_Z = 14;

function createGl() {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    document.body.innerHTML = '<p style="padding:12vw">This needs WebGL, which is not available here.</p>';
    return null;
  }
}

function start(gl) {
  document.body.prepend(gl.domElement);
  const mats = createMaterials({
    createCanvas: () => document.createElement("canvas"),
    anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()),
    paint: mulberry32(PAINT_SEED),
  });
  const kit = createKit(mats);
  const view = createView({ gl, mats, win: window });
  const worldRng = mulberry32(WORLD_SEED);
  const world = new THREE.Group();
  view.scene.add(world);
  world.add(buildStart(kit, worldRng));
  const buildSegment = createSegmentBuilder(kit, worldRng);
  const path = createPath({
    rng: worldRng,
    build: (spec) => {
      const group = buildSegment(spec);
      world.add(group);
      return group;
    },
    remove: (group) => {
      group.parent.remove(group);
      disposeGroup(group);
    },
  });
  path.ensure(LOOKAHEAD_Z);
  const tower = buildTower(mats);
  view.tScene.add(tower.group);
  placeTower(tower, view.tScene.fog, 0);

  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    mats.uniforms.time.value += dt;
    path.ensure(LOOKAHEAD_Z);
    view.camera.position.set(0, 1.7, 14);
    view.camera.rotation.set(0.03, 0, 0);
    view.render("walk", 0);
  }
  window.addEventListener("resize", () => view.resize());
  frame();
}

const gl = createGl();
if (gl) start(gl);
