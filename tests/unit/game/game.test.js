import { describe, expect, it } from "vitest";
import { PATH, SKIPS, TIMELINE, TOP } from "../../../src/config.js";
import { yearsText } from "../../../src/game/skips.js";
import { towerPlacement } from "../../../src/world/tower.js";
import { buildRig } from "../helpers/gameRig.js";

const IDLE = { fwd: 0, str: 0, run: false };
const FORWARD = { fwd: 1, str: 0, run: true };
const calls = (log, name) => log.filter((entry) => entry.name === name);
const times = (log, name) => calls(log, name).map((entry) => entry.t);

function runUntil(rig, input, done, limit = 20000) {
  for (let i = 0; i < limit; i++) {
    if (done()) return;
    rig.advance(0.05, input);
  }
  throw new Error("step limit reached");
}

const runFor = (rig, input, seconds) => {
  const end = rig.scheduler.now + seconds;
  runUntil(rig, input, () => rig.scheduler.now >= end - 1e-9);
};

describe("begin", () => {
  it("starts the engine, hides the title, and schedules the opening timeline", () => {
    const rig = buildRig();
    rig.game.begin();
    expect(rig.game.state.started).toBe(true);
    expect(calls(rig.logs.engine, "init")).toHaveLength(1);
    expect(calls(rig.logs.overlay, "hideStart")).toHaveLength(1);
    runFor(rig, IDLE, 11);
    expect(times(rig.logs.overlay, "curtainOff")).toEqual([0.2]);
    expect(times(rig.logs.overlay, "hintOn")).toEqual([2.6]);
    expect(times(rig.logs.overlay, "hintOff")).toEqual([10.5]);
  });
});

describe("initial state and idle", () => {
  it("matches the legacy start state", () => {
    const { game } = buildRig();
    expect(game.state).toMatchObject({
      phase: "walk", started: false, skipping: false, skipN: 0, climbSkips: 0, topSkipI: 0, backSkipI: 0,
      backNext: 400, nextSkip: 260, finalDone: false, skipAlt: 0, board: { x: 0, v: 0 }, dive: null,
      beamEnd: null, time: 0, inTunnel: false, yaw: 0, pitch: 0.03, player: { x: 0, y: 0, z: 14 },
    });
  });

  it("holds the title camera and advances the shader clock", () => {
    const rig = buildRig();
    rig.game.idle(0.25);
    expect(rig.mats.uniforms.time.value).toBe(0.25);
    expect(rig.view.camera.position.toArray()).toEqual([0, 1.7, 14]);
    expect(rig.view.camera.rotation.x).toBeCloseTo(0.03, 10);
  });
});

describe("look and input", () => {
  it("ignores movement while skipping but still turns the view", () => {
    const rig = buildRig();
    rig.game.begin();
    const { state } = rig.game;
    state.skipping = true;
    rig.game.update(0.1, FORWARD);
    expect(state.player.z).toBe(14);
    rig.game.look(0.2, 0.3);
    expect(state.yaw).toBeCloseTo(0.2, 10);
    expect(state.pitch).toBeCloseTo(0.33, 10);
    rig.game.look(0, 5);
    expect(state.pitch).toBe(1.5);
  });

  it("moves forward when free", () => {
    const rig = buildRig();
    rig.game.begin();
    rig.game.update(0.05, FORWARD);
    rig.game.update(0.05, FORWARD);
    expect(rig.game.state.player.z).toBeLessThan(14);
  });
});

describe("normal skip timeline", () => {
  it("runs the curtain at 0, 1.9, 7.6, 9.0, and 10.8", () => {
    const rig = buildRig();
    rig.game.begin();
    const { state } = rig.game;
    state.walked = 300;
    rig.game.update(0.05, IDLE);
    expect(state.skipping).toBe(true);
    const start = rig.scheduler.now;
    runFor(rig, IDLE, 10.7);
    expect(state.skipping).toBe(true);
    runFor(rig, IDLE, 0.2);
    expect(state.skipping).toBe(false);
    const { overlay, engine, sfx } = rig.logs;
    expect(calls(overlay, "setText")[0].args).toEqual([yearsText(4), ""]);
    expect(times(overlay, "curtainOn")).toEqual([start]);
    expect(times(overlay, "textOn")).toEqual([start + TIMELINE.TEXT_ON]);
    expect(times(overlay, "textOff")).toEqual([start + TIMELINE.TEXT_OFF]);
    expect(times(overlay, "curtainOff").slice(-1)).toEqual([start + TIMELINE.CURTAIN_OFF]);
    expect(times(sfx, "chime")).toEqual([start + TIMELINE.TEXT_ON]);
    const ducks = calls(engine, "duck").map((entry) => [entry.t, ...entry.args]);
    expect(ducks).toEqual([[start, ...TIMELINE.DUCK_LOW], [start + TIMELINE.CURTAIN_OFF, ...TIMELINE.DUCK_UP]]);
  });

  it("increments skipN and places the tower at mid", () => {
    const rig = buildRig();
    rig.game.begin();
    const { state } = rig.game;
    const fog = rig.view.tScene.fog;
    state.walked = 300;
    rig.game.update(0.05, IDLE);
    expect(state.skipN).toBe(1);
    expect(fog.density).toBeCloseTo(towerPlacement(0).fogDensity, 20);
    runFor(rig, IDLE, 1.8);
    expect(fog.density).toBeCloseTo(towerPlacement(0).fogDensity, 20);
    runFor(rig, IDLE, 0.2);
    expect(fog.density).toBeCloseTo(towerPlacement(1).fogDensity, 20);
    expect(state.player.z).toBeLessThan(-600);
    expect(state.nextSkip).toBeGreaterThan(state.walked);
  });

  it("enters the climb at mid of the fourth walk skip", () => {
    const rig = buildRig();
    rig.game.begin();
    const { state } = rig.game;
    state.skipN = 3;
    state.walked = 300;
    rig.game.update(0.05, IDLE);
    expect(state.skipN).toBe(4);
    runFor(rig, IDLE, 1.8);
    expect(state.phase).toBe("walk");
    runFor(rig, IDLE, 0.2);
    expect(state.phase).toBe("climb");
    expect(state.player.z).toBe(14);
    expect(state.pitch).toBe(0.25);
    expect(calls(rig.logs.overlay, "setText")[0].args[1]).toBe(SKIPS.ARRIVE_SUB);
  });
});

describe("final skip timeline", () => {
  it("shows only on, mid, and the end card, and stays locked", () => {
    const rig = buildRig();
    rig.game.stage("BEAM");
    const { state } = rig.game;
    runUntil(rig, FORWARD, () => state.beamEnd !== null);
    expect(calls(rig.logs.sfx, "beamChord")).toHaveLength(1);
    runUntil(rig, IDLE, () => state.skipping);
    const { overlay } = rig.logs;
    const start = calls(overlay, "curtainOn")[0].t;
    runFor(rig, IDLE, 12);
    const after = (name) => calls(overlay, name).filter((entry) => entry.t >= start);
    expect(after("curtainOn").map((entry) => entry.t)).toEqual([start]);
    expect(after("textOn").map((entry) => entry.t)).toEqual([start + TIMELINE.TEXT_ON]);
    expect(after("showEnd").map((entry) => [entry.t, entry.args[0]])).toEqual([[start + TIMELINE.END_CARD, SKIPS.FINAL.beam.end]]);
    expect(after("textOff")).toHaveLength(0);
    expect(after("curtainOff")).toHaveLength(0);
    expect(state.skipping).toBe(true);
    expect(calls(overlay, "setText").slice(-1)[0].args).toEqual([yearsText(SKIPS.FINAL.beam.years), SKIPS.FINAL.beam.sub]);
  });
});

describe("dive during its curtain", () => {
  it("keeps advancing t2 while skipping", () => {
    const rig = buildRig();
    rig.game.stage("TIP");
    const { state } = rig.game;
    runUntil(rig, FORWARD, () => state.dive !== null);
    expect(state.finalDone).toBe(true);
    runUntil(rig, IDLE, () => state.dive.stage === "skip");
    expect(state.skipping).toBe(true);
    runUntil(rig, IDLE, () => state.dive.stage === "fall2");
    expect(state.skipping).toBe(true);
    const before = state.dive.t2;
    runFor(rig, IDLE, 3);
    expect(state.skipping).toBe(true);
    expect(state.dive.t2).toBeGreaterThan(before + 2.9);
  });
});

describe("stage", () => {
  it.each([0, 1, 2, 3])("W%i", (k) => {
    const rig = buildRig();
    rig.game.stage(`W${k}`);
    const { state } = rig.game;
    expect(state.started).toBe(true);
    expect(state).toMatchObject({ phase: "walk", skipN: k, walked: 0, nextSkip: 260, yaw: 0, pitch: 0.03 });
    expect(state.player).toEqual({ x: 0, y: 0, z: 14 });
    expect(rig.view.tScene.fog.density).toBeCloseTo(towerPlacement(k).fogDensity, 20);
  });

  it.each([0, 1, 2, 3, 4])("C%i", (k) => {
    const rig = buildRig();
    rig.game.stage(`C${k}`);
    const { state } = rig.game;
    expect(state).toMatchObject({
      phase: "climb", climbSkips: k, skipAlt: k > 0 ? SKIPS.ALTS[k - 1] : 0, walked: 0, nextSkip: 170, pitch: 0.25,
    });
    expect(state.player).toEqual({ x: 0, y: 0, z: 14 });
  });

  it("TOP", () => {
    const rig = buildRig();
    rig.game.stage("TOP");
    expect(rig.game.state).toMatchObject({ phase: "top", skipAlt: SKIPS.ALTS[4], topSkipI: 0, pitch: 0.12, walked: 0 });
    expect(rig.game.state.player).toEqual({ x: 0, y: 0, z: 40 });
  });

  it("TIP", () => {
    const rig = buildRig();
    rig.game.stage("TIP");
    const { state } = rig.game;
    expect(state).toMatchObject({ phase: "top", topSkipI: SKIPS.TOP_AT.length });
    expect(state.player).toEqual({ x: 0, y: 0.6, z: -(698 + TOP.BOARD_L - 80) });
  });

  it("BEAM", () => {
    const rig = buildRig();
    rig.game.stage("BEAM");
    const { state } = rig.game;
    expect(state).toMatchObject({ phase: "top", topSkipI: SKIPS.TOP_AT.length, backSkipI: SKIPS.BACK_JUMP.length, yaw: Math.PI });
    expect(state.player.z).toBe(TOP.BEAM_Z - 30);
  });

  it("starts the game if needed and rejects unknown codes", () => {
    const rig = buildRig();
    expect(() => rig.game.stage("W9")).toThrow(/unknown stage/i);
    expect(() => rig.game.stage("nope")).toThrow(/unknown stage/i);
    expect(rig.game.state.started).toBe(false);
  });

  it("puts climb segments under the offset group", () => {
    const rig = buildRig();
    rig.game.stage("C0");
    rig.game.update(0.05, IDLE);
    const climbG = rig.view.scene.children.find((child) => child.position.x === PATH.CX);
    expect(climbG.children.length).toBeGreaterThan(0);
  });
});

describe("debug options", () => {
  const WALK = { fwd: 1, str: 0, run: false };

  it("setOptions speed multiplies how far the player walks", () => {
    const base = buildRig();
    const fast = buildRig();
    [base, fast].forEach((rig) => rig.game.begin());
    fast.game.setOptions({ speed: 4, fly: false });
    runFor(base, WALK, 2);
    runFor(fast, WALK, 2);
    const walked = (rig) => 14 - rig.game.state.player.z;
    expect(walked(fast) / walked(base)).toBeCloseTo(4, 1);
  });

  it("fly with rise lifts the player above the ground while z follows fwd", () => {
    const rig = buildRig();
    rig.game.begin();
    rig.game.setOptions({ speed: 1, fly: true });
    runFor(rig, { ...WALK, rise: 1 }, 2);
    expect(rig.game.state.player.y).toBeGreaterThan(5);
    expect(rig.game.state.player.z).toBeLessThan(10);
  });

  it("fly with negative rise never drops below the ground", () => {
    const rig = buildRig();
    rig.game.begin();
    rig.game.setOptions({ speed: 1, fly: true });
    runFor(rig, { ...WALK, rise: -1 }, 2);
    expect(rig.game.state.player.y).toBeGreaterThanOrEqual(0);
    runFor(rig, { ...WALK, rise: 1 }, 1);
    runFor(rig, { ...WALK, rise: -1 }, 5);
    expect(rig.game.state.player.y).toBe(0);
  });

  it("skipNow starts the first walk skip", () => {
    const rig = buildRig();
    rig.game.begin();
    expect(rig.game.skipNow()).toBe(true);
    expect(rig.game.state.skipN).toBe(1);
    expect(rig.game.state.skipping).toBe(true);
    expect(calls(rig.logs.overlay, "setText")[0].args[0]).toBe(yearsText(4));
  });

  it("skipNow does nothing before begin or while skipping", () => {
    const rig = buildRig();
    expect(rig.game.skipNow()).toBe(false);
    expect(rig.game.state.skipN).toBe(0);
    rig.game.begin();
    expect(rig.game.skipNow()).toBe(true);
    expect(rig.game.skipNow()).toBe(false);
    expect(rig.game.state.skipN).toBe(1);
  });

  it("skipNow in the top phase stops after the scheduled top skips", () => {
    const rig = buildRig();
    rig.game.stage("TOP");
    expect(rig.game.skipNow()).toBe(true);
    expect(rig.game.state.topSkipI).toBe(1);
    runUntil(rig, IDLE, () => !rig.game.state.skipping);
    expect(rig.game.skipNow()).toBe(true);
    runUntil(rig, IDLE, () => !rig.game.state.skipping);
    expect(rig.game.state.topSkipI).toBe(SKIPS.TOP_AT.length);
    expect(rig.game.skipNow()).toBe(false);
  });
});
