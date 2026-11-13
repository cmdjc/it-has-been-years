import * as THREE from "three";
import { OCEAN_Y, TOWER } from "../config.js";
import { BEAM_VERT, BEAM_FRAG } from "../gfx/shaders.js";
import { TEXTURE_SIZES, towerPainter, fallPainter, doorPainter } from "../gfx/textures.js";

const { TZ, TS, T_D, T_VIS } = TOWER;

export function buildTower(mats) {
  const group = new THREE.Group();
  const rsT = 200000;
  const sized = (name, draw) => mats.tex(TEXTURE_SIZES[name].w, TEXTURE_SIZES[name].h, draw);
  const towerTex = sized("tower", towerPainter());
  towerTex.anisotropy = 8;
  const tMat = new THREE.MeshLambertMaterial({ map: towerTex });
  const ringMat = new THREE.MeshLambertMaterial({ color: 0x86dbe2 });
  const tiers = [[520000, 500000], [495000, 700000], [455000, 900000], [400000, 1000000], [330000, 1100000], [260000, 1100000], [190000, 900000], [130000, 800000]].map(([r, h]) => [r, h * 1.5]);
  const rings = [];
  const ringsAt = [];
  let y = OCEAN_Y;
  tiers.forEach(([r, h]) => {
    const g = new THREE.CylinderGeometry(r * 0.965, r, h, 96, 1, false), uv = g.attributes.uv, circ = 2 * Math.PI * r;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / rsT, uv.getY(i) * h / rsT);
    const m = new THREE.Mesh(g, tMat); m.position.set(0, y + h / 2, TZ); group.add(m);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.965 * 1.03, r * 0.965 * 1.03, 30000, 96, 1, true), ringMat); rings.push(ring);
    ring.position.set(0, y + h, TZ); group.add(ring); ringsAt.push([y + h, r * 0.965 * 1.035]);
    y += h;
  });
  const spire = new THREE.Mesh(new THREE.ConeGeometry(70000, 900000, 32), tMat); spire.position.set(0, y + 450000, TZ); group.add(spire);
  const finMat = new THREE.MeshLambertMaterial({ color: 0xf1fafa });
  for (let i = 2; i < 17; i++) {
    const a = i / 18 * Math.PI * 2, R = 530000;
    const f = new THREE.Mesh(new THREE.BoxGeometry(30000, 3.4e6, 70000), finMat);
    f.position.set(Math.sin(a) * R, OCEAN_Y + 1.7e6, TZ + Math.cos(a) * R); f.rotation.y = a; group.add(f);
  }
  const fallTex = sized("fall", fallPainter(Math.random));
  fallTex.wrapS = fallTex.wrapT = THREE.ClampToEdgeWrapping;
  const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.92 });
  const fallH = tiers[0][1];
  for (let i = 0; i < 11; i++) {
    const a = -1.1 + i * 0.22, R = 524000;
    if (Math.abs(a) < 0.3) continue;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(16000, fallH), fallMat);
    w.position.set(Math.sin(a) * R, OCEAN_Y + fallH / 2, TZ + Math.cos(a) * R); w.rotation.y = a; group.add(w);
  }
  const bp = [];
  ringsAt.forEach(([ry, rr]) => { for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2; bp.push(Math.sin(a) * rr, ry + 16000, TZ + Math.cos(a) * rr); } });
  const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(bp, 3));
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: BEAM_VERT,
    fragmentShader: BEAM_FRAG,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1, 1, 160, 1, true), beamMat);
  beam.scale.set(1, 3e7, 1); beam.position.set(0, OCEAN_Y + 10.5e6 + 1.5e7, TZ); beam.frustumCulled = false; group.add(beam);
  const beacon = new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xa8f6ff, size: 34000 * TS, sizeAttenuation: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  group.add(beacon);
  const doorTex = sized("door", doorPainter());
  doorTex.wrapS = doorTex.wrapT = THREE.ClampToEdgeWrapping;
  const door = new THREE.Mesh(new THREE.PlaneGeometry(180000, 240000), new THREE.MeshBasicMaterial({ map: doorTex, transparent: true, fog: true }));
  door.position.set(0, OCEAN_Y + 120000, TZ + 520000 + 9000); group.add(door);
  group.scale.setScalar(TS);
  return { group, spire, beacon, beam, rings };
}

export const setBeamR = (beam, W) => { beam.scale.x = beam.scale.z = W / TS; };

export function towerPlacement(i) {
  const D = T_D[i], sink = Math.max(0, 91.2e6 - T_VIS[i]);
  return {
    position: [0, OCEAN_Y * (1 - TS) - sink, -D - TS * TZ],
    beamR: Math.max(5e4, Math.min(6e5, D * 0.0035)),
    fogDensity: (i >= 3 ? 0.6 : 0.8) / D,
    fogColor: i >= 3 ? 0xcfe9f4 : (i === 2 ? 0xa5c6dc : 0x7fa6c4),
  };
}

export function placeTower(tower, fog, i) {
  const { position, beamR, fogDensity, fogColor } = towerPlacement(i);
  tower.group.position.set(...position);
  setBeamR(tower.beam, beamR);
  fog.density = fogDensity;
  fog.color.set(fogColor);
}
