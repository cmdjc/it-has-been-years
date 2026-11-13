import * as THREE from "three";
import { decor } from "./structures.js";
import { buildLanding, buildRamp } from "./climb.js";
import {
  buildArch, buildAtrium, buildColonnade, buildGate, buildPool, buildStairs, buildTunnel, buildWalk,
} from "./segments.js";

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
