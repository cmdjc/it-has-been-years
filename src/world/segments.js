import * as THREE from "three";
import { decor } from "./structures.js";
import { buildLanding, buildRamp } from "./climb.js";

export function deck(kit, g, z0, L) {
  const { slab, shade, mats } = kit;
  const zc = z0 - L / 2;
  slab(g, 8, 1.2, L, 0, -0.6, zc);
  [-1, 1].forEach(s => slab(g, 0.4, 0.55, L, s * 3.8, 0.275, zc));
  slab(g, 1.0, 0.05, L, 0, 0.02, zc, mats.tileA);
  for (let z = z0 - 6; z > z0 - L + 3; z -= 14) slab(g, 1.8, 10.8, 1.8, 0, -6.6, z);
  shade(g, 15, L + 6, 0, zc);
}

export function buildWalk(kit, g, z0, L) { deck(kit, g, z0, L); }

export function buildArch(kit, g, z0, L, H) {
  const { tbox, slab, shade, mats } = kit;
  const N = Math.round(L / 2.2), dz = L / N;
  for (let i = 0; i < N; i++) {
    const s0 = i * dz, s1 = (i + 1) * dz;
    const h0 = H * Math.sin(Math.PI * s0 / L), h1 = H * Math.sin(Math.PI * s1 / L), hm = (h0 + h1) / 2;
    const ang = Math.atan2(h1 - h0, dz), len = Math.hypot(dz, h1 - h0) + 0.06, zc = z0 - (s0 + s1) / 2;
    const parts = [[8, 1.8, hm - 0.9, 0, mats.tileW], [1.0, 0.05, hm + 0.02, 0, mats.tileA]];
    parts.forEach(p => { const m = tbox(p[0], p[1], len, p[4], 0.6); m.position.set(p[3], p[2], zc); m.rotation.x = ang; g.add(m); });
    [-1, 1].forEach(s => { const m = tbox(0.4, 0.55, len, mats.tileW, 0.6); m.position.set(s * 3.8, hm + 0.275, zc); m.rotation.x = ang; g.add(m); });
  }
  slab(g, 8, 13, 2.4, 0, -7.7, z0 - 1.2); slab(g, 8, 13, 2.4, 0, -7.7, z0 - L + 1.2);
  shade(g, 15, L + 6, 0, z0 - L / 2);
}

export function buildStairs(kit, g, z0) {
  const { slab, pillar, shade, mats } = kit;
  const n = 24, run = 0.7, rise = 0.22, top = n * rise;
  for (let i = 0; i < n; i++) { const t = (i + 1) * rise; slab(g, 10, t + 3, run, 0, (t - 3) / 2, z0 - (i + 0.5) * run); }
  slab(g, 10, top + 3, 12, 0, (top - 3) / 2, z0 - n * run - 6);
  for (let i = 0; i < n; i++) { const t = top - (i + 1) * rise; slab(g, 10, t + 3, run, 0, (t - 3) / 2, z0 - n * run - 12 - (i + 0.5) * run); }
  const zc = z0 - n * run - 6;
  [-1, 1].forEach(s => pillar(g, 0.45, 6.4, s * 4.4, top + 3.2, zc - 3));
  slab(g, 10.4, 0.6, 1.4, 0, top + 6.7, zc - 3, mats.tileA);
  shade(g, 16, n * run * 2 + 18, 0, z0 - (n * run * 2 + 12) / 2);
}

export function buildTunnel(kit, g, z0, L) {
  const { slab, mats } = kit;
  deck(kit, g, z0, L);
  slab(g, 9.2, 0.6, L, 0, 4.3, z0 - L / 2, mats.tileA);
  const bays = Math.round(L / 6);
  for (let b = 0; b <= bays; b++) [-1, 1].forEach(s => slab(g, 0.8, 4, 0.8, s * 4.1, 2, z0 - b * 6));
  for (let b = 0; b < bays; b++) {
    const zc = z0 - (b + 0.5) * 6;
    [-1, 1].forEach(s => { slab(g, 0.6, 1, 5.2, s * 4.1, 0.5, zc, mats.tileA); slab(g, 0.6, 0.8, 5.2, s * 4.1, 3.6, zc, mats.tileA); });
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 3.0), mats.lightMat); l.position.set(0, 3.95, zc); g.add(l);
  }
}

export function buildPool(kit, g, z0, L) {
  const { slab, tcyl, shade, mats } = kit;
  deck(kit, g, z0, L);
  const zc = z0 - L / 2;
  [-1, 1].forEach(s => {
    slab(g, 12, 1.2, L, s * 21, -0.6, zc);
    slab(g, 0.6, 3.5, L, s * 15, -1.75, zc, mats.tileA);
    slab(g, 11, 3.5, 0.6, s * 9.5, -1.75, z0 - 0.3, mats.tileA); slab(g, 11, 3.5, 0.6, s * 9.5, -1.75, z0 - L + 0.3, mats.tileA);
    for (let k = -1; k <= 1; k += 2) {
      const lz = zc + k * 8;
      [-0.3, 0.3].forEach(o => { const p = tcyl(0.04, 0.04, 3.4, 8, mats.chromeMat, 1); p.position.set(s * 14.5, -0.1, lz + o); g.add(p); });
      for (let r = 0; r < 3; r++) { const rg = tcyl(0.03, 0.03, 0.6, 8, mats.chromeMat, 1); rg.rotation.x = Math.PI / 2; rg.position.set(s * 14.5, -1.1 + r * 0.7, lz); g.add(rg); }
    }
  });
  slab(g, 30, 0.5, L, 0, -3.5, zc, mats.tileA);
  const w = new THREE.Mesh(mats.unitPlane, mats.poolWater); w.rotation.x = -Math.PI / 2; w.scale.set(30, L, 1); w.position.set(0, -0.9, zc); g.add(w);
  const c = new THREE.Mesh(mats.unitPlane, mats.causticMat); c.rotation.x = -Math.PI / 2; c.scale.set(30, L, 1); c.position.set(0, -3.2, zc); g.add(c);
  const cx = -21, cz = zc;
  [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(o => slab(g, 0.22, 3.4, 0.22, cx + o[0], 1.7, cz + o[1], mats.chromeMat, 1));
  slab(g, 1.6, 0.14, 1.6, cx, 3.45, cz, mats.tileA, 0.6); slab(g, 1.6, 1.0, 0.12, cx, 4.0, cz - 0.75, mats.tileA, 0.6);
  shade(g, 46, L + 6, 0, zc);
}

export function buildColonnade(kit, g, z0, L) {
  const { slab, pillar, mats } = kit;
  deck(kit, g, z0, L);
  for (let z = z0 - 4; z > z0 - L; z -= 8) {
    [-1, 1].forEach(s => { pillar(g, 0.6, 12.2, s * 4.7, 4.9, z); pillar(g, 0.95, 0.5, s * 4.7, 11.3, z, mats.tileA); });
    slab(g, 10.8, 0.8, 1.4, 0, 11.95, z); slab(g, 10.8, 0.12, 1.5, 0, 11.5, z, mats.tileA);
  }
}

export function buildAtrium(kit, g, z0, L) {
  const { slab, mats } = kit;
  deck(kit, g, z0, L);
  const zc = z0 - L / 2;
  slab(g, 70, 0.5, L, 0, -3.5, zc, mats.tileA, 1.2);
  [-1, 1].forEach(q => { slab(g, 2, 90, L, q * 35, 41.5, zc, mats.tileW, 1.5); slab(g, 2.2, 3, L, q * 35, 20, zc, mats.tileA, 1.5); slab(g, 2.2, 3, L, q * 35, 60, zc, mats.tileA, 1.5); });
  const w = new THREE.Mesh(mats.unitPlane, mats.poolWater); w.rotation.x = -Math.PI / 2; w.scale.set(68, L, 1); w.position.set(0, -0.9, zc); g.add(w);
  const c = new THREE.Mesh(mats.unitPlane, mats.causticMat); c.rotation.x = -Math.PI / 2; c.scale.set(68, L, 1); c.position.set(0, -3.2, zc); g.add(c);
  for (let z = z0 - 7; z > z0 - L; z -= 14) {
    slab(g, 72, 2.4, 2.4, 0, 84, z, mats.tileW, 1.5);
    [-1, 1].forEach(q => slab(g, 1.6, 12, 2, q * 33, 78, z, mats.tileA, 1.5));
  }
}

export function buildGate(kit, g, z0, L) {
  const { slab, shade, mats } = kit;
  deck(kit, g, z0, L);
  const zc = z0 - L / 2;
  slab(g, 28, 62, 5, -21, 19, zc, mats.tileW, 1.2); slab(g, 28, 62, 5, 21, 19, zc, mats.tileW, 1.2); slab(g, 14, 32, 5, 0, 34, zc, mats.tileW, 1.2);
  slab(g, 70, 1.6, 5.2, 0, 19, zc, mats.tileA, 1.2); slab(g, 70, 1.0, 5.2, 0, 44, zc, mats.tileA, 1.2);
  shade(g, 74, 12, 0, zc);
}

export function createSegmentBuilder(kit, rng) {
  const walkBuilders = {
    walk: (g, { z0, L }) => buildWalk(kit, g, z0, L),
    arch: (g, { z0, L, H }) => buildArch(kit, g, z0, L, H),
    stairs: (g, { z0 }) => buildStairs(kit, g, z0),
    tunnel: (g, { z0, L }) => buildTunnel(kit, g, z0, L),
    pool: (g, { z0, L }) => buildPool(kit, g, z0, L),
    colonnade: (g, { z0, L }) => buildColonnade(kit, g, z0, L),
    atrium: (g, { z0, L }) => buildAtrium(kit, g, z0, L),
    gate: (g, { z0, L }) => buildGate(kit, g, z0, L),
  };
  return function build(spec) {
    const g = new THREE.Group();
    if (spec.mode === "climb") {
      g.position.y = spec.y0;
      if (spec.type === "ramp") buildRamp(kit, g, spec.z0, spec.L); else buildLanding(kit, g, spec.z0, spec.L);
      return g;
    }
    walkBuilders[spec.type](g, spec);
    if (spec.type !== "atrium") decor(kit, rng, g, spec.z0 - spec.L / 2, spec.L);
    return g;
  };
}
