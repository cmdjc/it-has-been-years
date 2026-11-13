import * as THREE from "three";
import { OCEAN_Y, PATH, SKIPS, TOP, TOWER } from "../config.js";
import { setBeamR } from "./tower.js";

const { PLANET_R } = TOP;
const { TS, TZ } = TOWER;
const CLONES = [[2.2e7, 0.5, 6], [3.6e7, 1.4, 7], [5.2e7, 2.4, 5], [7.4e7, 3.6, 6], [9.0e7, 4.6, 7], [1.05e8, 5.5, 5]];

export function makePlanet(mats) {
  const planet = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 192, 128), mats.planetMat);
  planet.visible = false; planet.frustumCulled = false;
  return planet;
}

export function stageTop({ tower, planet, seaFar, fog, tScene, mats }) {
  const { group, spire, beacon, beam, rings } = tower;
  group.visible = true;
  const cz = -700 + 1.0036e6;
  group.position.set(PATH.CX, -TS * (OCEAN_Y + 10.5e6) - 0.05, cz - TS * TZ);
  const seaY0 = OCEAN_Y - SKIPS.ALTS[4];
  planet.position.set(PATH.CX, seaY0 - PLANET_R, cz); mats.uniforms.planetC.value.copy(planet.position); planet.visible = true; seaFar.visible = false;
  const pivots = CLONES.map(([arc, az, sc]) => {
    const ph = arc / PLANET_R, u = new THREE.Vector3(Math.sin(ph) * Math.cos(az), Math.cos(ph), Math.sin(ph) * Math.sin(az));
    const pivot = new THREE.Group(); pivot.position.copy(planet.position).addScaledVector(u, PLANET_R); pivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), u);
    const c = group.clone(true); c.scale.setScalar(sc); c.position.set(0, -sc * OCEAN_Y, -sc * TZ); pivot.add(c); tScene.add(pivot);
    c.traverse(o => { if (o.material === beam.material) { o.scale.x = o.scale.z = 1.2e5 / sc; } });
    return pivot;
  });
  beam.visible = true; setBeamR(beam, 1e4);
  spire.visible = false; beacon.visible = false; rings[rings.length - 1].visible = false;
  fog.color.set(0x0c1c2e); fog.density = 6e-9;
  return pivots;
}
