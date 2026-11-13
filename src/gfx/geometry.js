import * as THREE from "three";
import { OCEAN_Y } from "../config.js";

export function disposeGroup(group) {
  group.traverse((object) => { if (object.geometry && !object.geometry.userData.shared) object.geometry.dispose(); });
}

export function createKit(mats) {
  function tbox(w, h, d, mat, rs) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const dm = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dm[f][0] / rs, uv.getY(k) * dm[f][1] / rs); }
    return new THREE.Mesh(g, mat);
  }
  function tcyl(rt, rb, h, seg, mat, rs) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg), uv = g.attributes.uv, c = Math.PI * (rt + rb);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c / rs, uv.getY(i) * h / rs);
    return new THREE.Mesh(g, mat);
  }
  function slab(g, w, h, d, x, y, z, mat = mats.tileW, rs = 0.6) {
    const m = tbox(w, h, d, mat, rs || 0.6); m.position.set(x, y, z); g.add(m); return m;
  }
  function pillar(g, r, h, x, y, z, mat = mats.tileW, rs = 0.6) {
    const m = tcyl(r, r, h, 14, mat, rs || 0.6); m.position.set(x, y, z); g.add(m); return m;
  }
  function shade(g, w, d, x, z) {
    const m = new THREE.Mesh(mats.unitPlane, mats.shadeMat); m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1); m.position.set(x, OCEAN_Y + 0.05, z); g.add(m);
  }
  return { mats, tbox, tcyl, slab, pillar, shade };
}
