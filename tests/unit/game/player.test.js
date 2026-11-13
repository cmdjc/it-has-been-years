import { describe, it, expect } from "vitest";
import { stepPlayer, followGround, stepGait, createPlayerState } from "../../../src/game/player.js";
import { SPEED, TOP } from "../../../src/config.js";

const state = (over = {}) => ({ ...createPlayerState(), phase: "walk", ...over });
const settle = (s, input, n = 600, dt = 1 / 60) => { for (let i = 0; i < n; i++) stepPlayer(s, input, dt); };

describe("createPlayerState", () => {
  it("matches the legacy start", () => {
    expect(createPlayerState()).toEqual({ player: { x: 0, y: 0, z: 14 }, yaw: 0, pitch: 0.03, speedNow: 0, stepPhase: 0, lastSin: 0, walked: 0 });
  });
});

describe("stepPlayer movement", () => {
  it("moves -z at walk speed after easing", () => {
    const s = state();
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(s.speedNow).toBeCloseTo(3.6 / 15, 12);
    expect(s.player.z).toBeCloseTo(14 - s.speedNow / 60, 12);
    s.speedNow = SPEED.WALK;
    const z = s.player.z;
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(z - s.player.z).toBeCloseTo(3.6 / 60, 12);
  });
  it("normalizes diagonal input", () => {
    const s = state({ speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: 1, run: false }, 1 / 60);
    expect(s.speedNow).toBeCloseTo(3.6, 12);
    expect(s.player.x).toBeCloseTo(Math.SQRT1_2 * 3.6 / 60, 12);
    expect(14 - s.player.z).toBeCloseTo(Math.SQRT1_2 * 3.6 / 60, 12);
  });
  it("runs at 6", () => {
    const s = state();
    settle(s, { fwd: 1, str: 0, run: true }, 300);
    expect(s.speedNow).toBeCloseTo(6, 6);
  });
  it("follows yaw", () => {
    const s = state({ yaw: Math.PI / 2, speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(s.player.x).toBeCloseTo(-3.6 / 60, 12);
  });
  it("does not move without input but decays speed", () => {
    const s = state({ speedNow: 3 });
    stepPlayer(s, { fwd: 0, str: 0, run: false }, 1 / 60);
    expect(s.player.z).toBe(14);
    expect(s.speedNow).toBeLessThan(3);
  });
  it("accumulates walked", () => {
    const s = state({ speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(s.walked).toBeCloseTo(2 * 3.6 / 60, 12);
  });
});

describe("stepPlayer walk phase clamps", () => {
  it("clamps width 6.4 on the platform and 3.2 after", () => {
    const s = state({ player: { x: 6.39, y: 0, z: 10 }, speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 0.001, str: 1, run: true }, 1);
    expect(s.player.x).toBe(6.4);
    const t = state({ player: { x: 3.1, y: 0, z: -5 }, speedNow: SPEED.WALK });
    stepPlayer(t, { fwd: 0, str: 1, run: false }, 1);
    expect(t.player.x).toBe(3.2);
  });
  it("blocks crossing z=0 with |x| > 3.2", () => {
    const s = state({ player: { x: 5, y: 0, z: 0.01 }, speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(s.player.z).toBe(0.01);
    const ok = state({ player: { x: 2, y: 0, z: 0.01 }, speedNow: SPEED.WALK });
    stepPlayer(ok, { fwd: 1, str: 0, run: false }, 1 / 60);
    expect(ok.player.z).toBeLessThan(0);
  });
  it("limits z to 23", () => {
    const s = state({ player: { x: 0, y: 0, z: 22.99 }, yaw: Math.PI, speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1);
    expect(s.player.z).toBe(23);
  });
});

describe("stepPlayer climb phase", () => {
  it("clamps |x| to 3.2 and z to 23", () => {
    const s = state({ phase: "climb", player: { x: 3.1, y: 5, z: 22.9 }, yaw: Math.PI, speedNow: SPEED.WALK });
    stepPlayer(s, { fwd: 1, str: -1, run: false }, 1);
    expect(s.player.x).toBe(3.2);
    expect(s.player.z).toBe(23);
  });
});

describe("stepPlayer top phase", () => {
  const top = (player, extra = {}) => state({ phase: "top", player, speedNow: SPEED.WALK, ...extra });
  it("blocks board entry when |x| > 0.55", () => {
    const s = top({ x: 1, y: 0, z: -693.4 });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1);
    expect(s.player.z).toBe(-693.5);
    expect(s.player.x).toBe(0.55);
  });
  it("allows entry when |x| <= 0.55 and clamps width on the board", () => {
    const s = top({ x: 0.5, y: 0, z: -693.4 });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1);
    expect(s.player.z).toBeLessThan(-693.5);
    const t = top({ x: 0.5, y: 0, z: -700 });
    stepPlayer(t, { fwd: 0, str: 1, run: false }, 1);
    expect(t.player.x).toBe(0.55);
  });
  it("limits the board end", () => {
    const s = top({ x: 0, y: 0, z: -(698 + TOP.BOARD_L - 4) + 0.01 });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1);
    expect(s.player.z).toBe(-(698 + TOP.BOARD_L - 4));
  });
  it("narrows to 2 on the pool walkway and 150 elsewhere", () => {
    const pool = top({ x: 1.9, y: 0, z: -500 });
    stepPlayer(pool, { fwd: 0, str: 1, run: false }, 1);
    expect(pool.player.x).toBe(2);
    const open = top({ x: 149, y: 0, z: -100 });
    stepPlayer(open, { fwd: 0, str: 1, run: false }, 1);
    expect(open.player.x).toBe(150);
  });
  it("limits z at the beam", () => {
    const s = top({ x: 0, y: 0, z: TOP.BEAM_Z + 59999.9 }, { yaw: Math.PI });
    stepPlayer(s, { fwd: 1, str: 0, run: false }, 1);
    expect(s.player.z).toBe(TOP.BEAM_Z + 60000);
  });
});

describe("followGround", () => {
  it("eases y toward ground", () => {
    const s = state();
    followGround(s, 1, 1 / 60);
    expect(s.player.y).toBeCloseTo(9 / 60, 12);
    followGround(s, 1, 1);
    expect(s.player.y).toBe(1);
  });
  it("snaps on the board", () => {
    const s = state({ phase: "top", player: { x: 0, y: 0, z: -700 } });
    followGround(s, 0.7, 1 / 60);
    expect(s.player.y).toBe(0.7);
    const t = state({ phase: "top", player: { x: 0, y: 0, z: -600 } });
    followGround(t, 0.7, 1 / 60);
    expect(t.player.y).toBeLessThan(0.7);
  });
});

describe("stepGait", () => {
  it("fires one step per half cycle", () => {
    const s = state({ speedNow: SPEED.WALK });
    let steps = 0;
    const dt = 1 / 60;
    for (let i = 0; i < 600; i++) if (stepGait(s, dt).stepped) steps++;
    const expected = Math.floor((3.6 * 10 * 1.7) / Math.PI);
    expect(Math.abs(steps - expected)).toBeLessThanOrEqual(1);
  });
  it("does not fire when slow", () => {
    const s = state({ speedNow: 0.3 });
    for (let i = 0; i < 600; i++) expect(stepGait(s, 1 / 60).stepped).toBe(false);
  });
  it("computes bob", () => {
    const s = state({ speedNow: SPEED.WALK });
    const { bob } = stepGait(s, 1 / 60);
    expect(bob).toBeCloseTo(Math.abs(Math.sin(3.6 / 60 * 1.7)) * 0.04, 12);
    expect(s.lastSin).toBeCloseTo(Math.sin(3.6 / 60 * 1.7), 12);
  });
});
