import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as config from "../../src/config.js";

const legacy = readFileSync(new URL("../../legacy/it-has-been-years.html", import.meta.url), "utf8");

function deepFrozen(value) {
  if (value === null || typeof value !== "object") return true;
  return Object.isFrozen(value) && Object.values(value).every(deepFrozen);
}

describe("config", () => {
  it("freezes every group deeply", () => {
    for (const [name, group] of Object.entries(config)) {
      expect(deepFrozen(group), name).toBe(true);
    }
    expect(Object.isFrozen(config.PATH.WEIGHTS[0])).toBe(true);
    expect(Object.isFrozen(config.SKIPS.YEARS)).toBe(true);
    expect(Object.isFrozen(config.START)).toBe(true);
  });

  it("copies scalar constants from the legacy file", () => {
    expect(config.OCEAN_Y).toBe(-2.2);
    expect(config.FOV).toBe(70);
    expect(config.WORLD_SEED).toBe(20240607);
    expect(legacy).toContain("const OCEAN_Y = -2.2;");
    expect(legacy).toContain("new THREE.Vector3(0.35, 0.62, 0.7)");
    expect(legacy).toContain("const FOV = 70;");
    expect(legacy).toContain("let seed = 20240607;");
    expect(config.SUN_DIR).toEqual([0.35, 0.62, 0.7]);
    expect(legacy).toContain("const CX = 30000, SLOPE = 0.42;");
    expect(config.PATH.CX).toBe(30000);
    expect(config.PATH.SLOPE).toBe(0.42);
    expect(legacy).toContain("const TZ = -12e6, TS = 8;");
    expect(config.TOWER.TZ).toBe(-12e6);
    expect(config.TOWER.TS).toBe(8);
  });

  it("copies the path tables", () => {
    expect(legacy).toContain(
      'const W = [["walk", 24], ["arch", 20], ["stairs", 12], ["tunnel", 15], ["pool", 13], ["colonnade", 10], ["gate", 6], ["atrium", 9]];',
    );
    expect(config.PATH.WEIGHTS).toEqual([["walk", 24], ["arch", 20], ["stairs", 12], ["tunnel", 15], ["pool", 13], ["colonnade", 10], ["gate", 6], ["atrium", 9]]);
    expect(legacy).toContain('const intro = ["walk", "pool", "walk", "pool", "walk", "walk"];');
    expect(config.PATH.INTRO).toEqual(["walk", "pool", "walk", "pool", "walk", "walk"]);
  });

  it("copies the tower tables", () => {
    expect(legacy).toContain("const T_D = [1.4e8, 4e7, 1.6e7, 6.5e6], T_VIS = [9e6, 4e7, 9.2e7, 9.2e7];");
    expect(config.TOWER.T_D).toEqual([1.4e8, 4e7, 1.6e7, 6.5e6]);
    expect(config.TOWER.T_VIS).toEqual([9e6, 4e7, 9.2e7, 9.2e7]);
  });

  it("copies top, speed, and timing constants", () => {
    expect(legacy).toContain("const PLANET_R = 4e7, BEAM_Z = 1.0029e6;");
    expect(legacy).toContain("const BOARD_L = 1000;");
    expect(legacy).toContain("const EYE_R = 5e6;");
    expect(config.TOP).toEqual({ BOARD_L: 1000, BEAM_Z: 1.0029e6, PLANET_R: 4e7, EYE_R: 5e6 });
    expect(legacy).toContain("? 6 : 3.6)");
    expect(config.SPEED).toEqual({ WALK: 3.6, RUN: 6 });
    expect(legacy).toContain("duck(0.12, 1.6);");
    expect(legacy).toContain("duck(0.9, 3);");
    expect(legacy).toContain("}, 1900);");
    expect(legacy).toContain("}, 7600);");
    expect(legacy).toContain("}, 10800);");
    expect(config.TIMELINE).toEqual({
      TEXT_ON: 1.9, TEXT_OFF: 7.6, CURTAIN_OFF: 9.0, UNLOCK: 10.8, END_CARD: 9.0, DUCK_LOW: [0.12, 1.6], DUCK_UP: [0.9, 3],
    });
  });

  it("copies the skip tables", () => {
    const { SKIPS } = config;
    expect(legacy).toContain("const YEARS = [4, 9, 23, 57, 140, 360, 900, 2300, 6000, 15000, 41000, 110000];");
    expect(SKIPS.YEARS).toEqual([4, 9, 23, 57, 140, 360, 900, 2300, 6000, 15000, 41000, 110000]);
    expect(legacy).toContain('{ 2: "The tower looks the same.", 4: "You are no closer.", 6: "You keep walking.", 9: "It is still there." }');
    expect(SKIPS.SUBS).toEqual({ 2: "The tower looks the same.", 4: "You are no closer.", 6: "You keep walking.", 9: "It is still there." });
    expect(SKIPS.CLIMB_YEARS).toEqual([1100, 5400, 24000, 130000, 800000]);
    expect(SKIPS.CLIMB_SUBS).toEqual(["The wall has not changed.", "The sea below you is only a color.", "You can see where the sea ends.", "The sky is going out.", "You have run out of wall."]);
    for (const text of SKIPS.CLIMB_SUBS) expect(legacy).toContain(`"${text}"`);
    expect(legacy).toContain("const ALTS = [3000, 60000, 900000, 12e6, 84e6 + OCEAN_Y];");
    expect(SKIPS.ALTS).toEqual([3000, 60000, 900000, 12e6, 84e6 + config.OCEAN_Y]);
    expect(SKIPS.BACK_JUMP).toEqual([300000, 350000, 340000]);
    expect(SKIPS.BACK_Y).toEqual([2900000, 5600000, 11000000]);
    expect(SKIPS.BACK_SUB).toEqual(["The light has not moved.", "It is nearer. It is no louder.", "You are almost inside it."]);
    expect(SKIPS.TOP_AT).toEqual([-330, -950]);
    expect(SKIPS.TOP_JUMP).toEqual([150, 400]);
    expect(SKIPS.TOP_Y).toEqual([2400000, 19000000]);
    expect(SKIPS.TOP_SUB).toEqual(["The pool is still warm.", "The board has not ended."]);
    expect(legacy).toContain("const TOP_AT = [-330, -950], TOP_JUMP = [150, 400];");
    expect(legacy).toContain("const TOP_Y = [2400000, 19000000];");
    expect(legacy).toContain('const TOP_SUB = ["The pool is still warm.", "The board has not ended."];');
    expect(SKIPS.ARRIVE_SUB).toBe("You are at the tower.");
    expect(legacy).toContain('sub = "You are at the tower."');
    expect(SKIPS.DIVE).toEqual({ years: 7400000, sub: "You are still falling." });
    expect(legacy).toContain("It has been 7,400,000 years.");
    expect(legacy).toContain('$("sub").textContent = "You are still falling."');
  });

  it("copies the final texts exactly", () => {
    const { beam, dive } = config.SKIPS.FINAL;
    expect(beam.years).toBe(62000000);
    expect(dive.years).toBe(31000000);
    expect(legacy).toContain(`yrs = 62000000; sub = ${JSON.stringify(beam.sub)}; endText = ${JSON.stringify(beam.end)};`);
    expect(legacy).toContain(`yrs = 31000000; sub = ${JSON.stringify(dive.sub)}; endText = ${JSON.stringify(dive.end)};`);
    expect(beam.end).toContain("<br>");
    expect(dive.end).toContain("<br>");
  });

  it("copies the start and hint constants", () => {
    expect(config.START).toEqual({ CURTAIN_OFF: 0.2, HINT_ON: 2.6, HINT_OFF: 10.5 });
    expect(legacy).toContain('setTimeout(() => $("white").classList.add("off"), 200);');
    expect(legacy).toContain('classList.add("on"), 2600);');
    expect(legacy).toContain('classList.remove("on"), 10500);');
    expect(config.HINT_HOLD).toBe(7.5);
    expect(legacy).toContain('classList.remove("on"), 7500);');
    expect(config.HINTS).toEqual({ first: "Walk toward the tower.", climb: ["Climb.", 9.6], top: [["Walk out along the board.", 9.6], ["Look down.", 17.5]] });
    expect(legacy).toContain('<div id="hint">Walk toward the tower.</div>');
    expect(legacy).toContain('hint("Walk out along the board."), 9600');
    expect(legacy).toContain('hint("Look down."), 17500');
    expect(legacy).toMatch(/hint\("Climb\."\), 9600/);
  });
});

describe("chapters", () => {
  it("lists the 12 stage codes with names", () => {
    expect(config.CHAPTERS).toHaveLength(12);
    expect(config.CHAPTERS.map(([code]) => code)).toEqual(["W0", "W1", "W2", "W3", "C0", "C1", "C2", "C3", "C4", "TOP", "TIP", "BEAM"]);
    expect(config.CHAPTERS[10]).toEqual(["TIP", "The diving board"]);
  });
});
