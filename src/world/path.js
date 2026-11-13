import { PATH } from "../config.js";

const BLOCKED_EARLY = new Set(["tunnel", "colonnade", "gate", "atrium", "stairs", "arch"]);
const EARLY_SEGMENTS = 14;
const LOOKAHEAD = 800;
const RETIRE_BEHIND = 320;
const REGENERATE_ADDS = 40;
const RAMP_LENGTH = 45;
const FIXED_LENGTHS = { stairs: 24 * 0.7 * 2 + 12, tunnel: 48, pool: 36, colonnade: 56, atrium: 70, gate: 16 };

export function createPath({ rng, build, remove }) {
  const state = { segs: [], genZ: 0, lastType: "", segCount: 0, climbY: 0, mode: "walk" };

  function pickType() {
    if (state.segCount < PATH.INTRO.length) return PATH.INTRO[state.segCount];
    const early = state.segCount < EARLY_SEGMENTS;
    const allowed = ([type]) => type !== state.lastType && !(early && BLOCKED_EARLY.has(type));
    const candidates = PATH.WEIGHTS.filter(allowed);
    let roll = rng() * candidates.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [type, weight] of candidates) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return "walk";
  }

  function addClimbSegment() {
    const z0 = state.genZ;
    const type = state.segCount === 0 || state.lastType === "ramp" ? "landing" : "ramp";
    const L = type === "landing" ? (state.segCount === 0 ? 24 : 12) : RAMP_LENGTH;
    const y0 = state.climbY;
    const g = build({ mode: "climb", type, z0, L, y0 });
    state.segs.push({ type, z0, L, z1: z0 - L, H: 0, y0, g });
    if (type === "ramp") state.climbY += L * PATH.SLOPE;
    state.genZ = z0 - L;
    state.lastType = type;
    state.segCount++;
  }

  function addWalkSegment() {
    const type = pickType();
    state.lastType = type;
    state.segCount++;
    const z0 = state.genZ;
    let L;
    let H = 0;
    if (type === "walk") L = 50 + rng() * 60;
    else if (type === "arch") {
      L = 56 + rng() * 30;
      H = 5 + rng() * 5;
    } else L = FIXED_LENGTHS[type];
    const g = build({ mode: "walk", type, z0, L, H });
    state.segs.push({ type, z0, L, z1: z0 - L, H, y0: 0, g });
    state.genZ = z0 - L;
  }

  const add = () => (state.mode === "climb" ? addClimbSegment() : addWalkSegment());

  function ensure(playerZ, max = 99) {
    let added = 0;
    while (state.genZ > playerZ - LOOKAHEAD && added++ < max) add();
    while (state.segs.length && state.segs[0].z1 > playerZ + RETIRE_BEHIND) remove(state.segs.shift().g);
  }

  const segAt = (z) => state.segs.find((seg) => z <= seg.z0 && z > seg.z1) || null;

  function clear() {
    while (state.segs.length) remove(state.segs.pop().g);
  }

  function enterClimb() {
    clear();
    Object.assign(state, { mode: "climb", segCount: 0, lastType: "", genZ: 24, climbY: 0 });
  }

  function regenerate(playerZ, distance) {
    clear();
    state.genZ = playerZ + 60;
    if (state.mode === "climb") {
      state.climbY += PATH.SLOPE * distance * (RAMP_LENGTH / 57);
      state.lastType = "landing";
      state.segCount = 1;
    }
    for (let i = 0; i < REGENERATE_ADDS; i++) ensure(playerZ, 1);
  }

  return { state, add, ensure, segAt, clear, enterClimb, regenerate, clearAll: clear };
}
