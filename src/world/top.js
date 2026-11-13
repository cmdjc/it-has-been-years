import * as THREE from "three";
import { TOP } from "../config.js";
import { boardShape } from "../game/board.js";
import { TEXTURE_SIZES, signPainter } from "../gfx/textures.js";
import { struct } from "./structures.js";

const { BOARD_L, BEAM_Z } = TOP;

export function buildTop(kit, rng) {
  const { mats, tbox, slab, pillar } = kit;
  const { tileW, tileA, poolWater, unitPlane } = mats;
  const g = new THREE.Group();
  slab(g, 40000, 4, 60700, 0, -2, 29650, tileW, 3);
  slab(g, 4, 0.05, 60700, 0, 0.02, 29650, tileA, 3);
  slab(g, 400, 0.6, 0.6, 0, 0.3, -699.5, tileA, 0.6);
  slab(g, 120, 0.04, 200, 0, 0.04, -520, tileA, 1);
  slab(g, 120.8, 0.9, 0.6, 0, 0.45, -420, tileA, 1); slab(g, 120.8, 0.9, 0.6, 0, 0.45, -620, tileA, 1);
  [-60, 60].forEach(x => slab(g, 0.6, 0.9, 200, x, 0.45, -520, tileA, 1));
  const pw = new THREE.Mesh(unitPlane, poolWater); pw.rotation.x = -Math.PI / 2; pw.scale.set(120, 200, 1); pw.position.set(0, 0.78, -520); g.add(pw);
  slab(g, 4, 0.9, 200, 0, 0.45, -520, tileW, 0.6); slab(g, 1, 0.02, 200, 0, 0.91, -520, tileA, 0.6);
  struct(kit, rng, g, 7, 7, -668, 1.4, 0);
  const signTex = t => {
    const tx = mats.tex(TEXTURE_SIZES.sign.w, TEXTURE_SIZES.sign.h, signPainter(t[0], t[1]), 1, 1);
    tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
    return tx;
  };
  const signPost = (parent, x, z, lines) => {
    const g2 = new THREE.Group(); g2.position.set(x, 0, z); parent.add(g2);
    pillar(g2, 0.06, 2.8, -1.38, 1.4, 0, tileW, 0.6);
    lines.forEach((ln, i) => {
      const y = 2.35 - i * 0.8, mat = new THREE.MeshBasicMaterial({ map: signTex(ln), side: THREE.DoubleSide });
      slab(g2, 2.5, 0.7, 0.08, 0, y, 0, tileW, 0.6);
      const a = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), mat); a.position.set(0, y, 0.05); g2.add(a);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), mat); b.position.set(0, y, -0.05); b.rotation.y = Math.PI; g2.add(b);
    });
  };
  signPost(g, 3.2, 26, [["↑ DIVING BOARD", "#1d6f7a"], ["↓ BEAM", "#2b4a8a"]]);
  signPost(g, 2.0, -686, [["DIVING BOARD", "#1d6f7a"]]);
  const beamPad = new THREE.Group(); beamPad.position.set(0, 0, BEAM_Z);
  slab(beamPad, 80, 2, 80, 0, -0.98, 0, tileW, 3);
  slab(beamPad, 8, 0.22, 0.8, 0, 0.13, -5.6, tileW, 0.6); slab(beamPad, 8, 0.44, 0.8, 0, 0.24, -4.8, tileW, 0.6); slab(beamPad, 8, 0.66, 7.6, 0, 0.35, -0.6, tileW, 0.6);
  slab(beamPad, 5, 0.02, 5, 0, 0.69, 0, tileA, 0.6);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.8, 48), new THREE.MeshBasicMaterial({ color: 0xbff8ff, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.71; beamPad.add(ring);
  signPost(beamPad, 5.8, -9, [["BEAM", "#2b4a8a"]]);
  const farSlab = tbox(40000, 4, 40000, tileW, 3); farSlab.position.set(0, -2, 80000);
  const boardParts = [];
  for (let i = 0; i < 48; i++) {
    const len = BOARD_L / 48, zc = -698 - (i + 0.5) * len;
    boardParts.push({ m: slab(g, 1.1, 0.1, len + 0.03, 0, 0.55, zc, tileA, 0.6), y0: 0.55, s: (i + 0.5) * len });
    boardParts.push({ m: slab(g, 0.3, 0.02, len + 0.03, 0, 0.61, zc, tileW, 0.6), y0: 0.61, s: (i + 0.5) * len });
  }
  for (let m = 100; m < BOARD_L; m += 100) [-1.4, 1.4].forEach(x => slab(g, 0.16, 3.2, 0.16, x, 1.6, -698 - m, tileW, 0.6));
  slab(g, 2.2, 0.5, 3.4, 0, 0.25, -698.6, tileW, 0.6); slab(g, 2.0, 0.3, 0.6, 0, 0.4, -702.5, tileA, 0.6);
  return { group: g, beamPad, farSlab, boardParts };
}

export function bendBoard(boardParts, boardX) {
  for (const p of boardParts) p.m.position.y = p.y0 + boardX * boardShape(p.s);
}

export function placeFarSlab(farSlab, playerZ) {
  if (playerZ > 50000) { if (Math.abs(farSlab.position.z - playerZ) > 15000) farSlab.position.z = Math.round(playerZ / 3) * 3; }
  else farSlab.position.z = 80000;
}
