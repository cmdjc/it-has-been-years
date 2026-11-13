const deepFreeze = (value) => {
  if (value !== null && typeof value === "object") Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const OCEAN_Y = -2.2;
export const SUN_DIR = deepFreeze([0.35, 0.62, 0.7]);
export const FOV = 70;
export const WORLD_SEED = 20240607;
export const SEEDS = deepFreeze({ jump: 1618033, paint: 3141592, sound: 2718281 });

export const PATH = deepFreeze({
  CX: 30000,
  SLOPE: 0.42,
  WEIGHTS: [["walk", 24], ["arch", 20], ["stairs", 12], ["tunnel", 15], ["pool", 13], ["colonnade", 10], ["gate", 6], ["atrium", 9]],
  INTRO: ["walk", "pool", "walk", "pool", "walk", "walk"],
});

export const TOWER = deepFreeze({
  TZ: -12e6,
  TS: 8,
  T_D: [1.4e8, 4e7, 1.6e7, 6.5e6],
  T_VIS: [9e6, 4e7, 9.2e7, 9.2e7],
});

export const TOP = deepFreeze({ BOARD_L: 1000, BEAM_Z: 1.0029e6, PLANET_R: 4e7, EYE_R: 5e6 });

export const SPEED = deepFreeze({ WALK: 3.6, RUN: 6 });

export const SKIPS = deepFreeze({
  YEARS: [4, 9, 23, 57, 140, 360, 900, 2300, 6000, 15000, 41000, 110000],
  SUBS: { 2: "The tower looks the same.", 4: "You are no closer.", 6: "You keep walking.", 9: "It is still there." },
  CLIMB_YEARS: [1100, 5400, 24000, 130000, 800000],
  CLIMB_SUBS: ["The wall has not changed.", "The sea below you is only a color.", "You can see where the sea ends.", "The sky is going out.", "You have run out of wall."],
  ALTS: [3000, 60000, 900000, 12e6, 84e6 + OCEAN_Y],
  BACK_JUMP: [300000, 350000, 340000],
  BACK_Y: [2900000, 5600000, 11000000],
  BACK_SUB: ["The light has not moved.", "It is nearer. It is no louder.", "You are almost inside it."],
  TOP_AT: [-330, -950],
  TOP_JUMP: [150, 400],
  TOP_Y: [2400000, 19000000],
  TOP_SUB: ["The pool is still warm.", "The board has not ended."],
  ARRIVE_SUB: "You are at the tower.",
  DIVE: { years: 7400000, sub: "You are still falling." },
  FINAL: {
    beam: { years: 62000000, sub: "It is quiet. It is bright.", end: "You went up the light.<br>It was quiet, and very bright.<br>You did not come back down." },
    dive: { years: 31000000, sub: "It had been waiting a very long time.", end: "You fell all the way down.<br>It had been waiting.<br>It never blinked." },
  },
});

export const TIMELINE = deepFreeze({
  TEXT_ON: 1.9,
  TEXT_OFF: 7.6,
  CURTAIN_OFF: 9.0,
  UNLOCK: 10.8,
  END_CARD: 9.0,
  DUCK_LOW: [0.12, 1.6],
  DUCK_UP: [0.9, 3],
});

export const START = deepFreeze({ CURTAIN_OFF: 0.2, HINT_ON: 2.6, HINT_OFF: 10.5 });

export const HINT_HOLD = 7.5;

export const HINTS = deepFreeze({
  first: "Walk toward the tower.",
  climb: ["Climb.", 9.6],
  top: [["Walk out along the board.", 9.6], ["Look down.", 17.5]],
});
