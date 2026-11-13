import { describe, expect, it } from "vitest";
import { SKIPS } from "../../../src/config.js";
import { yearsText } from "../../../src/game/skips.js";
import { buildRig } from "../helpers/gameRig.js";

const STEP = 0.05;
const STEP_LIMIT = 60000;
const FORWARD = { fwd: 1, str: 0, run: true };
const BACKWARD = { fwd: -1, str: 0, run: true };

function play(steer) {
  const rig = buildRig();
  const { game, logs } = rig;
  game.begin();
  const phases = [game.state.phase];
  for (let step = 0; logs.overlay.every((entry) => entry.name !== "showEnd"); step++) {
    if (step >= STEP_LIMIT) {
      throw new Error(`step limit reached in phase ${game.state.phase} at z=${game.state.player.z} after ${logs.overlay.filter((e) => e.name === "setText").length} skips`);
    }
    rig.advance(STEP, steer(game.state));
    if (game.state.phase !== phases[phases.length - 1]) phases.push(game.state.phase);
  }
  const years = logs.overlay.filter((entry) => entry.name === "setText").map((entry) => entry.args[0]);
  const end = logs.overlay.find((entry) => entry.name === "showEnd").args[0];
  return { phases, years, end, state: game.state };
}

const walkAndClimbYears = [...SKIPS.YEARS.slice(0, 4), ...SKIPS.CLIMB_YEARS].map(yearsText);

describe("headless full run", () => {
  it("plays from the title to the dive ending", () => {
    const run = play(() => FORWARD);
    expect(run.phases).toEqual(["walk", "climb", "top"]);
    expect(run.years).toEqual([
      ...walkAndClimbYears,
      ...SKIPS.TOP_Y.map(yearsText),
      yearsText(SKIPS.DIVE.years),
      yearsText(SKIPS.FINAL.dive.years),
    ]);
    expect(run.end).toBe(SKIPS.FINAL.dive.end);
    expect(run.state.topSkipI).toBe(2);
    expect(run.state.finalDone).toBe(true);
  }, 60000);

  it("plays from the title to the beam ending", () => {
    const run = play((state) => (state.phase === "top" && state.backSkipI < SKIPS.BACK_JUMP.length ? BACKWARD : FORWARD));
    expect(run.phases).toEqual(["walk", "climb", "top"]);
    expect(run.years).toEqual([
      ...walkAndClimbYears,
      ...SKIPS.BACK_Y.map(yearsText),
      yearsText(SKIPS.FINAL.beam.years),
    ]);
    expect(run.end).toBe(SKIPS.FINAL.beam.end);
    expect(run.state.backSkipI).toBe(SKIPS.BACK_JUMP.length);
  }, 60000);
});
