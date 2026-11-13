import { SKIPS, TIMELINE, TOP } from "../config.js";

const GROWTH = 2.6;
const BEAM_RADIUS = 1.1;
const DIVE_Z = -(698 + TOP.BOARD_L - 10);

export const yearsText = (years) => "It has been " + years.toLocaleString("en-US") + " years.";

export function walkSkip(skipN) {
  const { YEARS, SUBS, ARRIVE_SUB } = SKIPS;
  const years = skipN <= YEARS.length
    ? YEARS[skipN - 1]
    : Math.round(YEARS[YEARS.length - 1] * GROWTH ** (skipN - YEARS.length));
  if (skipN === 4) return { years, sub: ARRIVE_SUB, arrive: "climb" };
  return { years, sub: SUBS[skipN - 1] || "" };
}

export function climbSkip(climbSkips) {
  const index = climbSkips - 1;
  const years = SKIPS.CLIMB_YEARS[index];
  const sub = SKIPS.CLIMB_SUBS[index];
  if (climbSkips >= 5) return { years, sub, arrive: "top" };
  return { years, sub, alt: SKIPS.ALTS[index] };
}

export function topSkip(topSkipI) {
  const k = Math.min(topSkipI, SKIPS.TOP_Y.length - 1);
  return { years: SKIPS.TOP_Y[k], sub: SKIPS.TOP_SUB[k] };
}

export const backSkip = (k) => ({
  years: SKIPS.BACK_Y[k],
  sub: SKIPS.BACK_SUB[k],
  last: k === SKIPS.BACK_JUMP.length - 1,
  jump: SKIPS.BACK_JUMP[k],
});

export function jumpDistance(phase, topSkipI, rnd) {
  if (phase === "walk") return 700 + rnd() * 700;
  if (phase === "climb") return 450 + rnd() * 450;
  return SKIPS.TOP_JUMP[Math.max(0, Math.min(topSkipI - 1, SKIPS.TOP_JUMP.length - 1))];
}

export const nextSkipAt = (walked, phase, rnd) => walked + (phase === "climb" ? 170 : 240) + rnd() * 130;

export const curtainSteps = (final) => final
  ? [[0, "on"], [TIMELINE.TEXT_ON, "mid"], [TIMELINE.END_CARD, "end"]]
  : [[0, "on"], [TIMELINE.TEXT_ON, "mid"], [TIMELINE.TEXT_OFF, "textOff"], [TIMELINE.CURTAIN_OFF, "off"], [TIMELINE.UNLOCK, "unlock"]];

export function pendingEvent(state) {
  if (state.skipping) return null;
  if (state.phase !== "top") return state.walked > state.nextSkip ? "skip" : null;
  const { x, z } = state.player;
  const free = !state.dive && !state.beamEnd;
  if (free && state.topSkipI < SKIPS.TOP_AT.length && z < SKIPS.TOP_AT[state.topSkipI]) return "topSkip";
  if (free && !state.finalDone && z < DIVE_Z) return "dive";
  if (free && state.backSkipI < SKIPS.BACK_JUMP.length && z > state.backNext) return "back";
  if (free && Math.hypot(x, z - TOP.BEAM_Z) < BEAM_RADIUS) return "beam";
  return state.walked > state.nextSkip ? "skip" : null;
}
