import { WORLD_SEED } from "../../../src/config.js";
import { mulberry32 } from "../../../src/core/rng.js";
import { createScheduler } from "../../../src/core/scheduler.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { createKit } from "../../../src/gfx/geometry.js";
import { createView } from "../../../src/gfx/renderer.js";
import { createGame } from "../../../src/game/game.js";
import { spyGl } from "./spyGl.js";
import { stubCanvas } from "./stubCanvas.js";

const recorder = (log, scheduler) => new Proxy({}, {
  get: (_, name) => (...args) => {
    log.push({ name, args, t: scheduler.now });
  },
});

export function buildRig() {
  const scheduler = createScheduler();
  const logs = { overlay: [], engine: [], sfx: [] };
  const mats = createMaterials({ createCanvas: (w, h) => stubCanvas(w, h), anisotropy: 8, paint: mulberry32(1) });
  const kit = createKit(mats);
  const view = createView({ gl: spyGl(), mats, win: { innerWidth: 800, innerHeight: 400, devicePixelRatio: 1 } });
  const game = createGame({
    view, mats, kit, scheduler,
    overlay: recorder(logs.overlay, scheduler),
    engine: recorder(logs.engine, scheduler),
    sfx: recorder(logs.sfx, scheduler),
    rng: { world: mulberry32(WORLD_SEED), jump: mulberry32(7) },
  });
  const advance = (dt, input) => {
    game.update(dt, input);
    scheduler.advance(dt);
  };
  return { game, scheduler, logs, view, mats, advance };
}
