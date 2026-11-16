import { describe, it, expect } from "vitest";
import { SKIPS, TIMELINE, TOP } from "../../../src/config.js";
import {
  yearsText, walkSkip, climbSkip, topSkip, backSkip, jumpDistance, nextSkipAt, curtainSteps, pendingEvent,
} from "../../../src/game/skips.js";

const countingRnd = (value) => {
  const rnd = () => {
    rnd.calls++;
    return value;
  };
  rnd.calls = 0;
  return rnd;
};

describe("yearsText", () => {
  it("formats with en-US separators", () => {
    expect(yearsText(1234567)).toBe("It has been 1,234,567 years.");
    expect(yearsText(4)).toBe("It has been 4 years.");
  });
});

describe("walkSkip", () => {
  it("reads every table entry", () => {
    SKIPS.YEARS.forEach((years, index) => {
      const skipN = index + 1;
      const result = walkSkip(skipN);
      expect(result.years).toBe(years);
      const expectedSub = skipN === 4 ? SKIPS.ARRIVE_SUB : SKIPS.SUBS[skipN - 1] || "";
      expect(result.sub).toBe(expectedSub);
      expect(result.arrive).toBe(skipN === 4 ? "climb" : undefined);
    });
  });

  it("grows 2.6x per skip past the table", () => {
    const last = SKIPS.YEARS[SKIPS.YEARS.length - 1];
    expect(walkSkip(13).years).toBe(Math.round(last * 2.6));
    expect(walkSkip(14).years).toBe(Math.round(last * 2.6 ** 2));
    expect(walkSkip(13).sub).toBe(SKIPS.SUBS[12] || "");
  });
});

describe("climbSkip", () => {
  it("reads every table entry with its altitude", () => {
    SKIPS.CLIMB_YEARS.forEach((years, index) => {
      const climbSkips = index + 1;
      const result = climbSkip(climbSkips);
      expect(result.years).toBe(years);
      expect(result.sub).toBe(SKIPS.CLIMB_SUBS[index]);
      if (climbSkips >= 5) {
        expect(result.arrive).toBe("top");
        expect(result.alt).toBeUndefined();
      } else {
        expect(result.arrive).toBeUndefined();
        expect(result.alt).toBe(SKIPS.ALTS[index]);
      }
    });
  });
});

describe("topSkip", () => {
  it("reads the table and clamps to the last entry", () => {
    expect(topSkip(0)).toEqual({ years: SKIPS.TOP_Y[0], sub: SKIPS.TOP_SUB[0] });
    expect(topSkip(1)).toEqual({ years: SKIPS.TOP_Y[1], sub: SKIPS.TOP_SUB[1] });
    expect(topSkip(5)).toEqual({ years: SKIPS.TOP_Y[1], sub: SKIPS.TOP_SUB[1] });
  });
});

describe("backSkip", () => {
  it("reads every table entry and flags the last", () => {
    SKIPS.BACK_JUMP.forEach((jump, k) => {
      expect(backSkip(k)).toEqual({
        years: SKIPS.BACK_Y[k],
        sub: SKIPS.BACK_SUB[k],
        last: k === SKIPS.BACK_JUMP.length - 1,
        jump,
      });
    });
  });
});

describe("jumpDistance", () => {
  it("draws once for walk and climb", () => {
    const walkRnd = countingRnd(0.5);
    expect(jumpDistance("walk", 0, walkRnd)).toBe(700 + 0.5 * 700);
    expect(walkRnd.calls).toBe(1);
    const climbRnd = countingRnd(0.5);
    expect(jumpDistance("climb", 0, climbRnd)).toBe(450 + 0.5 * 450);
    expect(climbRnd.calls).toBe(1);
  });

  it("uses the table without drawing at the top", () => {
    const rnd = countingRnd(0.5);
    expect(jumpDistance("top", 0, rnd)).toBe(SKIPS.TOP_JUMP[0]);
    expect(jumpDistance("top", 1, rnd)).toBe(SKIPS.TOP_JUMP[0]);
    expect(jumpDistance("top", 2, rnd)).toBe(SKIPS.TOP_JUMP[1]);
    expect(jumpDistance("top", 9, rnd)).toBe(SKIPS.TOP_JUMP[1]);
    expect(rnd.calls).toBe(0);
  });
});

describe("nextSkipAt", () => {
  it("draws once and adds the phase gap", () => {
    const walkRnd = countingRnd(0.5);
    expect(nextSkipAt(1000, "walk", walkRnd)).toBe(1000 + 240 + 0.5 * 130);
    expect(walkRnd.calls).toBe(1);
    const climbRnd = countingRnd(0.5);
    expect(nextSkipAt(1000, "climb", climbRnd)).toBe(1000 + 170 + 0.5 * 130);
    expect(climbRnd.calls).toBe(1);
  });
});

describe("curtainSteps", () => {
  it("lists the normal timeline", () => {
    expect(curtainSteps(false)).toEqual([
      [0, "on"],
      [TIMELINE.TEXT_ON, "mid"],
      [TIMELINE.TEXT_OFF, "textOff"],
      [TIMELINE.CURTAIN_OFF, "off"],
      [TIMELINE.UNLOCK, "unlock"],
    ]);
  });

  it("lists the final timeline", () => {
    expect(curtainSteps(true)).toEqual([
      [0, "on"],
      [TIMELINE.TEXT_ON, "mid"],
      [TIMELINE.END_CARD, "end"],
    ]);
  });
});

describe("pendingEvent", () => {
  const baseState = () => ({
    phase: "walk",
    skipping: false,
    dive: null,
    beamEnd: null,
    topSkipI: 0,
    finalDone: false,
    backSkipI: 0,
    backNext: 400,
    walked: 0,
    nextSkip: 100,
    player: { x: 0, z: 0 },
  });
  const topState = (overrides = {}) => ({ ...baseState(), phase: "top", ...overrides });
  const diveZ = -(698 + TOP.BOARD_L - 10) - 1;

  it("returns null while skipping", () => {
    expect(pendingEvent({ ...topState({ player: { x: 0, z: -400 } }), skipping: true })).toBeNull();
    expect(pendingEvent({ ...baseState(), skipping: true, walked: 500 })).toBeNull();
  });

  it("skips by distance outside the top phase", () => {
    expect(pendingEvent({ ...baseState(), walked: 101 })).toBe("skip");
    expect(pendingEvent({ ...baseState(), walked: 100 })).toBeNull();
    expect(pendingEvent({ ...baseState(), phase: "climb", walked: 101 })).toBe("skip");
  });

  it("triggers the top skip by position", () => {
    expect(pendingEvent(topState({ player: { x: 0, z: -331 } }))).toBe("topSkip");
    expect(pendingEvent(topState({ topSkipI: 1, player: { x: 0, z: -331 } }))).toBeNull();
    expect(pendingEvent(topState({ topSkipI: 1, player: { x: 0, z: -951 } }))).toBe("topSkip");
    expect(pendingEvent(topState({ topSkipI: 2, player: { x: 0, z: -400 } }))).toBeNull();
  });

  it("triggers the dive at the board end once", () => {
    const player = { x: 0, z: diveZ };
    expect(pendingEvent(topState({ topSkipI: 2, player }))).toBe("dive");
    expect(pendingEvent(topState({ topSkipI: 2, player, finalDone: true }))).toBeNull();
  });

  it("triggers the back skip past backNext", () => {
    expect(pendingEvent(topState({ topSkipI: 2, player: { x: 0, z: 401 } }))).toBe("back");
    expect(pendingEvent(topState({ topSkipI: 2, player: { x: 0, z: 400 } }))).toBeNull();
    expect(pendingEvent(topState({ topSkipI: 2, backSkipI: 3, player: { x: 0, z: 401 } }))).toBeNull();
  });

  it("triggers the beam inside the radius", () => {
    const near = { x: 0.5, z: TOP.BEAM_Z };
    expect(pendingEvent(topState({ topSkipI: 2, backSkipI: 3, player: near }))).toBe("beam");
    const far = { x: 1.2, z: TOP.BEAM_Z };
    expect(pendingEvent(topState({ topSkipI: 2, backSkipI: 3, player: far }))).toBeNull();
  });

  it("triggers the beam when the movement segment passes through it", () => {
    const state = (z0, z1, x) => topState({ topSkipI: 2, backSkipI: 3, prev: { x, z: z0 }, player: { x, z: z1 } });
    expect(pendingEvent(state(TOP.BEAM_Z - 2.5, TOP.BEAM_Z + 2.5, 0))).toBe("beam");
    expect(pendingEvent(state(TOP.BEAM_Z - 2.5, TOP.BEAM_Z + 2.5, 2))).toBeNull();
  });

  it("suppresses top events during a dive or beam", () => {
    const player = { x: 0, z: -400 };
    expect(pendingEvent(topState({ player, dive: {} }))).toBeNull();
    expect(pendingEvent(topState({ player, beamEnd: {} }))).toBeNull();
  });

  it("never skips by distance in the top phase", () => {
    expect(pendingEvent(topState({ topSkipI: 2, walked: 101 }))).toBeNull();
    expect(pendingEvent(topState({ topSkipI: 2, walked: 101, dive: {} }))).toBeNull();
  });

  it("orders topSkip before dive before back before beam", () => {
    const everything = { topSkipI: 0, backSkipI: 0, backNext: -1e9, player: { x: 0, z: diveZ } };
    expect(pendingEvent(topState(everything))).toBe("topSkip");
    expect(pendingEvent(topState({ ...everything, topSkipI: 2 }))).toBe("dive");
    expect(pendingEvent(topState({ ...everything, topSkipI: 2, finalDone: true }))).toBe("back");
    const atBeam = { topSkipI: 2, finalDone: true, backNext: -1e9, player: { x: 0, z: TOP.BEAM_Z } };
    expect(pendingEvent(topState(atBeam))).toBe("back");
    expect(pendingEvent(topState({ ...atBeam, backSkipI: 3 }))).toBe("beam");
  });
});
