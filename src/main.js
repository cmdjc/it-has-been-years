import "./ui/style.css";
import * as THREE from "three";
import { SEEDS, WORLD_SEED } from "./config.js";
import { mulberry32 } from "./core/rng.js";
import { createScheduler } from "./core/scheduler.js";
import { parseDebug } from "./debug.js";
import { createAudio } from "./audio/audio.js";
import { createSfx } from "./audio/sfx.js";
import { createMaterials } from "./gfx/materials.js";
import { createKit } from "./gfx/geometry.js";
import { adapt, createQuality, createView } from "./gfx/renderer.js";
import { createGame } from "./game/game.js";
import { createInput } from "./input/input.js";
import { createOverlay } from "./ui/overlay.js";

const MAX_STEP = 0.05;

function createGl() {
  try {
    return new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch {
    document.body.innerHTML = '<p style="padding:12vw">This needs WebGL, which is not available here.</p>';
    return null;
  }
}

function start(gl) {
  const { debug, stage, timescale } = parseDebug(window.location.search);
  document.body.prepend(gl.domElement);
  const soundRng = mulberry32(SEEDS.sound);
  const mats = createMaterials({
    createCanvas: () => document.createElement("canvas"),
    anisotropy: Math.min(8, gl.capabilities.getMaxAnisotropy()),
    paint: mulberry32(SEEDS.paint),
  });
  const kit = createKit(mats);
  const view = createView({ gl, mats, win: window });
  const scheduler = createScheduler();
  const overlay = createOverlay(document, scheduler);
  const engine = createAudio({ AudioContext: window.AudioContext || window.webkitAudioContext, rng: soundRng });
  const sfx = createSfx(engine, soundRng);
  const input = createInput(gl.domElement, window);
  const game = createGame({
    view, mats, kit, overlay, engine, sfx, scheduler,
    rng: { world: mulberry32(WORLD_SEED), jump: mulberry32(SEEDS.jump) },
  });
  const { state } = game;
  const clock = new THREE.Clock();
  const quality = createQuality(window.devicePixelRatio);
  let axesOverride = null;

  overlay.onBegin(() => {
    game.begin();
    clock.getDelta();
  });
  overlay.onAgain(() => window.location.reload());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) engine.suspend();
    else engine.resume();
  });
  window.addEventListener("resize", () => view.resize());

  if (stage) game.stage(stage);
  if (debug) {
    window.__ihby = {
      state: () => ({
        phase: state.phase,
        started: state.started,
        skipping: state.skipping,
        x: state.player.x,
        y: state.player.y,
        z: state.player.z,
        yaw: state.yaw,
        pitch: state.pitch,
        walked: state.walked,
        skipN: state.skipN,
        climbSkips: state.climbSkips,
        topSkipI: state.topSkipI,
        backSkipI: state.backSkipI,
        dive: state.dive ? state.dive.stage : null,
        beam: Boolean(state.beamEnd),
        ended: getComputedStyle(document.getElementById("end")).display !== "none",
      }),
      input: (axes) => { axesOverride = axes; },
      stage: (code) => game.stage(code),
    };
  }

  function frame() {
    requestAnimationFrame(frame);
    const raw = clock.getDelta();
    if (state.started) {
      if (!state.skipping) {
        const pixelRatio = adapt(quality, raw);
        if (pixelRatio !== null) view.setPixelRatio(pixelRatio);
      }
      const { yaw, pitch } = input.takeLook();
      game.look(yaw, pitch);
      const total = Math.min(MAX_STEP, raw) * timescale;
      const steps = Math.max(1, Math.ceil(total / MAX_STEP - 1e-9));
      for (let i = 0; i < steps; i++) game.update(total / steps, axesOverride ?? input.axes());
    } else game.idle(Math.min(MAX_STEP, raw));
    scheduler.advance(raw * timescale);
    view.render(state.phase, mats.uniforms.space.value);
  }
  frame();
}

const gl = createGl();
if (gl) start(gl);
