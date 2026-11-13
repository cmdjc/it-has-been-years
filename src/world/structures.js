import * as THREE from "three";
import { OCEAN_Y } from "../config.js";

export function struct(kit, rng, g, type, x, z, k, by) {
  const { mats, tbox, tcyl, slab, pillar, shade } = kit;
  const { tileW, tileA, chromeMat, poolWater, unitPlane, buoyGeo, buoyW, buoyA } = mats;
  const s = new THREE.Group(); s.position.set(x, by, z); g.add(s);
  const rs = Math.max(0.6, k * 0.5);
  const deep = by + 8;
  const body = (w, d, hh) => slab(s, w, hh || deep, d, 0, -(hh || deep) / 2, 0, tileW, rs);
  if (type === 0) {
    const r = (1.5 + rng() * 3) * k, h = (15 + rng() * 70) * k;
    const bot = -deep, m = tcyl(r, r * 1.06, h - bot, 16, tileW, rs); m.position.y = (h + bot) / 2; s.add(m);
    const cap = tcyl(r * 1.25, r * 1.25, 1.2 * k, 16, tileA, rs); cap.position.y = h; s.add(cap);
  } else if (type === 1) {
    const w = (20 + rng() * 60) * k, d = (20 + rng() * 60) * k;
    body(w, d); slab(s, w - 6 * k, 0.1 * k + 0.1, d - 6 * k, 0, 0.0, 0, tileA, rs);
    if (rng() < 0.5) { const pw = new THREE.Mesh(unitPlane, poolWater); pw.rotation.x = -Math.PI / 2; pw.scale.set(w * 0.5, d * 0.5, 1); pw.position.y = 0.12 * k + 0.12; s.add(pw); }
    shade(g, w + 10 * k, d + 10 * k, x, z);
  } else if (type === 2) {
    let w = (50 + rng() * 50) * k; const d0 = (50 + rng() * 40) * k; let y = 0;
    for (let i = 0; i < 5; i++) {
      const hh = 3 * k + (i === 0 ? deep : 0);
      slab(s, w, hh, d0 * (w / ((50 + 50) * k)) + 10 * k, 0, y + (i === 0 ? (3 * k - deep) / 2 : 3 * k / 2), 0, i % 2 ? tileA : tileW, rs);
      y += 3 * k; w *= 0.78;
    }
  } else if (type === 3) {
    const w = 44 * k, d = 26 * k; body(w, d); slab(s, w - 4 * k, 0.1 * k + 0.1, d - 4 * k, 0, 0, 0, tileA, rs);
    [-1, 1].forEach(q => pillar(s, 2.2 * k, 24 * k, q * 11 * k, 12 * k, 0, tileW, rs));
    slab(s, 28 * k, 3 * k, 6 * k, 0, 25.5 * k, 0, tileW, rs); slab(s, 28.4 * k, 0.8 * k, 6.2 * k, 0, 24.2 * k, 0, tileA, rs);
    shade(g, w + 10 * k, d + 10 * k, x, z);
  } else if (type === 4) {
    const Lb = (80 + rng() * 200) * k, w = 8 * k;
    slab(s, w, 1.2 * k + 0.1, Lb, 0, -0.6 * k, 0, tileW, rs); slab(s, w * 0.12, 0.1, Lb, 0, 0.05, 0, tileA, rs);
    for (let q = -Lb / 2 + 7 * k; q < Lb / 2; q += 14 * k) slab(s, 1.8 * k, deep + 10 * k, 1.8 * k, 0, -(deep + 10 * k) / 2 - 1.2 * k, q, tileW, rs);
    shade(g, w + 8 * k, Lb + 8 * k, x, z);
  } else if (type === 5) {
    const R = 10 * k, H = 40 * k, N = 40;
    body(30 * k, 30 * k); slab(s, 26 * k, 0.1 * k + 0.1, 26 * k, 0, 0, 0, tileA, rs);
    pillar(s, 1.5 * k, H, 0, H / 2, 0, tileW, rs);
    for (let i = 0; i < N; i++) {
      const a = i / N * 3 * Math.PI * 2, y = 1 + i / N * H;
      const m = tbox(5 * k, 0.6 * k, 5 * k, i % 2 ? tileA : tileW, rs); m.position.set(Math.cos(a) * R, y, Math.sin(a) * R); m.rotation.y = -a; s.add(m);
    }
    shade(g, 40 * k, 40 * k, x, z);
  } else if (type === 6) {
    body(26 * k, 26 * k); slab(s, 22 * k, 0.1 * k + 0.1, 22 * k, 0, 0, 0, tileA, rs);
    slab(s, 5 * k, 60 * k, 5 * k, 0, 30 * k, 0, tileW, rs);
    [10, 30, 58].forEach(h => { slab(s, 12 * k, 0.4 * k + 0.05, 3 * k, 8.5 * k, h * k, 0, tileA, rs); slab(s, 2 * k, 0.5 * k, 4 * k, 3 * k, h * k - 0.4 * k, 0, tileW, rs); });
    shade(g, 36 * k, 36 * k, x, z);
  } else if (type === 7) {
    const h = 3.4 * k;
    [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(o => { const m = tcyl(0.12 * k, 0.12 * k, h + deep, 8, chromeMat, 1); m.position.set(o[0] * k, (h - deep) / 2, o[1] * k); s.add(m); });
    slab(s, 1.8 * k, 0.16 * k, 1.8 * k, 0, h + 0.08 * k, 0, tileA, rs); slab(s, 1.8 * k, 1.1 * k, 0.14 * k, 0, h + 0.7 * k, -0.85 * k, tileA, rs);
  } else if (type === 8) {
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const zz = -i * 42 * k;
      [-1, 1].forEach(q => { const m = tcyl(1.5 * k, 1.5 * k, 18 * k + deep, 14, tileW, rs); m.position.set(q * 7 * k, (18 * k - deep) / 2, zz); s.add(m); });
      slab(s, 17 * k, 2 * k, 3 * k, 0, 19 * k, zz, tileW, rs); slab(s, 17.2 * k, 0.5 * k, 3.2 * k, 0, 17.9 * k, zz, tileA, rs);
    }
  } else if (type === 9) {
    const hh = 4 * k;
    [-1, 1].forEach(q => { const m = tcyl(0.18 * k, 0.18 * k, hh + deep, 8, chromeMat, 1); m.position.set(q * 1.2 * k, (hh - deep) / 2, 0); s.add(m); });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(1.2 * k, 0.18 * k, 8, 20, Math.PI), chromeMat); arc.position.y = hh; s.add(arc);
    for (let r = 0; r < 5; r++) { const m = tcyl(0.1 * k, 0.1 * k, 2.4 * k, 8, chromeMat, 1); m.rotation.z = Math.PI / 2; m.position.set(0, hh * 0.2 + r * 0.7 * k, 0); s.add(m); }
  } else if (type === 10) {
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(buoyGeo, i % 2 ? buoyA : buoyW); m.scale.setScalar(0.6 * k); m.position.set(0, OCEAN_Y - by + 0.35 * k, -i * 3 * k); s.add(m); }
  } else {
    const N = 40, rise = 0.5 * k, run = 0.8 * k, w = 14 * k;
    for (let i = 0; i < N; i++) { const t = (i + 1) * rise; slab(s, w, t + deep, run, 0, (t - deep) / 2, -(i + 0.5) * run, i % 8 === 7 ? tileA : tileW, rs); }
    slab(s, w, deep + N * rise, 6 * k, 0, (N * rise - deep) / 2, -N * run - 3 * k, tileW, rs);
    [-1, 1].forEach(q => pillar(s, 1 * k, 8 * k, q * 5 * k, N * rise + 4 * k, -N * run - 3 * k, tileW, rs));
    slab(s, 12 * k, 1.2 * k, 2.6 * k, 0, N * rise + 8.6 * k, -N * run - 3 * k, tileA, rs);
    shade(g, w + 8 * k, N * run + 14 * k, x, z - N * run / 2);
  }
}

export function decor(kit, rng, g, zMid, L) {
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const side = rng() < 0.5 ? -1 : 1, t = Math.floor(rng() * 12);
    let k = 1, dist = 28 + rng() * 260;
    if (t === 7 || t === 9) { k = 4 + rng() * 8; dist = 70 + rng() * 260; }
    else if (t === 5) k = 1 + rng(); else if (t === 6) k = 1.4 + rng();
    else if (t === 10) dist = 14 + rng() * 40;
    struct(kit, rng, g, t, side * dist, zMid + (rng() - 0.5) * (L + 120), k, 0);
  }
}

export function buildStart(kit, rng) {
  const { slab, shade, mats } = kit;
  const g = new THREE.Group();
  slab(g, 14, 1.2, 24, 0, -0.6, 12); slab(g, 3, 0.05, 24, 0, 0.02, 12, mats.tileA);
  [-1, 1].forEach(s => { slab(g, 0.4, 0.55, 24, s * 6.8, 0.275, 12); });
  slab(g, 14, 0.55, 0.4, 0, 0.275, 24); shade(g, 22, 32, 0, 12);
  for (let i = 0; i < 80; i++) {
    const k = 4 + rng() * 38, side = rng() < 0.5 ? -1 : 1;
    struct(kit, rng, g, Math.floor(rng() * 12), side * (60 + 55 * k + rng() * 7500), 700 - rng() * 15000, k, k * 1.1);
  }
  return g;
}
