import * as THREE from "three";
import { PATH } from "../config.js";
import { TEXTURE_SIZES, wallPainter } from "../gfx/textures.js";
import { deck } from "./segments.js";

export function buildRamp(kit, g, z0, L) {
  const { tbox, mats } = kit;
  const rise = L * PATH.SLOPE, ang = Math.atan(PATH.SLOPE), len = L / Math.cos(ang), zc = z0 - L / 2;
  const m = tbox(8, 1.2, len, mats.stairMat, 0.6); m.position.set(0, rise / 2 - 0.6 * Math.cos(ang), zc); m.rotation.x = ang; g.add(m);
  const p = tbox(0.3, 1.05, len, mats.tileW, 0.6); p.position.set(3.85, rise / 2 + 0.5, zc); p.rotation.x = ang; g.add(p);
  const q = tbox(0.3, 0.6, len, mats.tileW, 0.6); q.position.set(-3.85, rise / 2 + 0.3, zc); q.rotation.x = ang; g.add(q);
}

export function buildLanding(kit, g, z0, L) {
  const { slab, mats } = kit;
  const zc = z0 - L / 2;
  slab(g, 8, 1.2, L, 0, -0.6, zc); slab(g, 1, 0.05, L, 0, 0.02, zc, mats.tileA);
  slab(g, 0.3, 1.05, L, 3.85, 0.525, zc); slab(g, 0.3, 0.6, L, -3.85, 0.3, zc);
  slab(g, 0.3, 3.2, 2.2, -4.0, 1.6, zc, mats.tileA); slab(g, 0.1, 2.7, 1.7, -3.82, 1.35, zc, mats.doorWarm);
}

export function makeWall(mats) {
  const { w, h } = TEXTURE_SIZES.wall;
  const tex = mats.tex(w, h, wallPainter(), 1875, 1875);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000), new THREE.MeshLambertMaterial({ map: tex }));
  mesh.rotation.y = Math.PI / 2;
  return { mesh, tex };
}

export function followWall(wall, cameraY, playerZ) {
  wall.mesh.position.set(PATH.CX - 4.2, cameraY, playerZ);
  wall.tex.offset.set(((-playerZ / 64) % 1 + 1) % 1, ((cameraY / 64) % 1 + 1) % 1);
}

export function buildClimbBase(kit) {
  const { slab, shade, mats } = kit;
  const g = new THREE.Group();
  deck(kit, g, 624, 600);
  slab(g, 6.4, 1.2, 24, 7.2, -0.6, 12, mats.tileW, 0.6);
  slab(g, 0.4, 0.55, 24, 10.2, 0.275, 12, mats.tileW, 0.6); slab(g, 6.4, 0.55, 0.4, 7.2, 0.275, 24, mats.tileW, 0.6);
  [6, 18].forEach(z => slab(g, 1.8, 10.8, 1.8, 7.2, -6.6, z, mats.tileW, 0.6));
  shade(g, 8, 28, 7.2, 12);
  return g;
}
