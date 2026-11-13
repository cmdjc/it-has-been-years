# Rebuild plan for It Has Been Years

## Context

The game is one HTML file of 1176 lines, made in a prototyping session. It works, and the owner calls it finished. But all code is in one closure. It has shared mutable globals and timer chains in `setTimeout`. It has three copies of the skip timeline, and it mixes `Math.random` with the seeded RNG. It also has dead code and no tests.

This plan rebuilds the game as a Vite project of small ES modules. Vitest runs the unit tests. The end-to-end (e2e) tests talk to Brave through the Chrome DevTools Protocol (CDP). The player sees the same game. Only the internals change.

The owner made these decisions on 2026-11-12:

- Scope: only It Has Been Years. The other three games move to `legacy/` with no change.
- Old files: the first git commit keeps all files as they were. Then the original game, the other games, the screenshots, and HANDOFF.md move to `legacy/`. Git keeps `history/` and `vendor/`, so the tree drops them. One exception: `history/it-has-been-years/v26.html` moves to `legacy/it-has-been-years-stages.html`. It is the final game plus the stage-jump buttons, and the e2e parity test drives it.
- Tooling: Vite and Vitest. The e2e tests use raw CDP over the built-in `WebSocket` of Node 22, with no Playwright.
- Fidelity: same experience, clean internals. Every tuned constant, text, timing, color, and shader stays. These internal changes are allowed:
  - a game-clock scheduler replaces `setTimeout`,
  - seeded RNG streams replace `Math.random`,
  - dead code goes (the planar reflection path, `resetWorld`, `superSpeed`, `M_dark`, and the unread `towerClones` list),
  - a `?stage=` debug flag replaces the removed debug buttons.

## Source of truth

The source of truth is `legacy/it-has-been-years.html`, the moved original. Its line numbers are the same as in the first commit. Each brief gives the line range that it ports. If a brief and the legacy file give a different number, text, or color, the legacy file is correct.

## Target layout

```
it-has-been-years/
  index.html                 DOM shell (legacy lines 1-47), loads /src/main.js
  package.json               scripts: dev, build, preview, test, e2e, lint, check
  vite.config.js             base "./", Vitest configuration (unit tests only)
  eslint.config.js
  README.md                  written last
  docs/PLAN.md               this plan, with the task table kept current
  src/
    main.js                  bootstrap and frame loop only
    config.js                every tuned constant, frozen, grouped by phase
    core/   rng.js  scheduler.js  math.js
    ui/     style.css  overlay.js      curtain (white screen), hint, start, end card, beam glow
    input/  input.js                   keyboard, mouse look, touch joystick
    audio/  audio.js  sfx.js           engine (context, master, reverb, noise) and the sounds
    gfx/    shaders.js  textures.js  materials.js  geometry.js  post.js  renderer.js
    world/  path.js  segments.js  structures.js  climb.js  tower.js  top.js  planet.js  eye.js
    game/   ground.js  player.js  board.js  altitude.js  skips.js  dive.js  beam.js  game.js
    debug.js                 ?stage= and ?timescale= parsing, window.__ihby test hooks
  tests/
    unit/                    mirrors src/, one test file per module
    e2e/  cdp.js  server.js  game.e2e.test.js   out/ (screenshots, ignored by git)
  legacy/
    it-has-been-years.html  it-has-been-years-stages.html  HANDOFF.md  screenshots/
    the-long-bridge/  open-late/  small-warm-room/
```

## Architecture rules

1. Logic and view are separate. The `game/*` modules hold pure state transitions. They do not touch the three.js scene, the DOM, or audio. They take state and `dt` and change plain data. The `world/*` and `gfx/*` modules build and update meshes. Only `game/game.js` connects state to view, overlay, and audio.
2. One `state` object, made in `game/game.js`, replaces the legacy globals. These are its fields: `phase`, `player{x,y,z}`, `yaw`, `pitch`, `speedNow`, `stepPhase`, `walked`, `nextSkip`, `skipN`, `climbSkips`, `topSkipI`, `backSkipI`, `backNext`, `finalDone`, `skipping`, `skipAlt`, `board{x,v}`, `dive`, `beamEnd`, and `time`.
3. Time: `core/scheduler.js` runs timers on game time. Let `ts` be the time scale. It is 1 unless `?timescale=` sets it. Each frame:
   - Physics time is `min(0.05, raw) * ts`. It runs as `ceil(total / 0.05)` equal substeps. At `ts=1` this is the legacy single clamped step.
   - The scheduler advances by `raw * ts` after the physics substeps. The legacy `setTimeout` timers also ran on wall time between frames.
   - CSS transitions and audio ramps stay on wall time. At `ts > 1` the curtain can lag the teleport. This is accepted, because `ts > 1` is only for debug and e2e. Timing tests at `ts=1` and fast playthrough tests are separate tests.
4. Randomness: `core/rng.js` exports `mulberry32(seed)`, the algorithm of legacy line 173. There are four streams. The `world` stream gets the same calls in the same order as the legacy `rand`.
   - `world` (seed 20240607): only the legacy `rand` calls (far field, `pickType`, segment sizes, decor, struct sizes).
   - `jump`: the legacy `Math.random` calls in game logic (skip jump distances on line 821, `nextSkip` on line 822).
   - `paint`: the texture painters.
   - `sound`: noise buffers and step pitch.
5. Inject dependencies instead of globals. `gfx/textures.js` makes every canvas texture (tiles, caustics, shade, stairs, tower, falls, door, wall, signs) through an injected `createCanvas(w, h)`. The browser passes `document.createElement("canvas")`. Node tests pass a stub canvas whose 2D context records calls. Materials, including every `ShaderMaterial`, are real in tests, because three.js builds them without WebGL. Audio takes an `AudioContext` constructor, so tests pass a fake.
6. three.js stays at 0.128.0 (`import * as THREE from "three"`), because the post pipeline uses `WebGLMultisampleRenderTarget`.
7. No comments, except where the math is not obvious. No short names such as `T` at module level.

## Behavior contracts

The port must keep each of these behaviors.

- Update order per frame (legacy 950-1061):
  1. time and caustic offset
  2. input to movement, then phase clamps
  3. walked distance, `ensure`, tunnel flag
  4. board spring, ground follow, step sound and board bounce
  5. camera position, wall follow, altitude, camera rotation
  6. dive override, beam radius and far slab, beam override
  7. skip triggers
- Render order (legacy 1112-1139):
  1. far scene (in the top phase, two depth ranges: 1e5 to 3e8, then 2 to 2.5e5)
  2. clear depth, then near scene
  3. bright pass, four blur passes, final grade
- Skip timeline (legacy 795-831 and 890-919). One `curtain(text, sub, onMid, {final})` function replaces the three legacy copies.
  - t=0: curtain on, duck to 0.12 over 1.6 s.
  - t=1.9: text on, chime, mid-action.
  - t=7.6: text off.
  - t=9.0: curtain off, duck to 0.9 over 3 s.
  - t=10.8: `skipping=false`.
- Final skip (legacy 824-827): only t=0, t=1.9, and the end card at t=9.0 occur. The text, the curtain, the duck to 0.12, and `skipping=true` all stay. A separate test checks this sequence.
- `update()` keeps running while `skipping` is true. Only the input becomes zero (legacy 954-957).
  - The dive and the beam ascent advance during their curtains.
  - `wakeAtSea` runs at the 1.9 s mid-action, and `fall2` advances for the remaining 8.9 s.
  - The beam camera keeps rising through its final curtain.
  - The board spring updates every frame in the top phase, before the dive impulse reads it.
- Start (legacy 1161-1167): curtain off at 0.2 s, hint on at 2.6 s, hint off at 10.5 s.
- Phase hints: climb at 9.6 s. Top at 9.6 s and 17.5 s. A new hint cancels the pending fade of the previous hint.
- Initial state (legacy 631 and 709): player at `(0, 0, 14)`, `pitch 0.03`, board `x=0, v=0`, `nextSkip 260`.
- Years text: `"It has been " + n.toLocaleString("en-US") + " years."`. After the end of the table, each walk skip multiplies the years by 2.6.
- Adaptive quality (legacy 1140-1149) runs only while the game is started and not skipping. Below 38 fps over 2.5 s, it multiplies the pixel ratio by 0.75, down to 0.8. It reduces at most 3 times.

## Testing strategy

- TDD per task. The implementer writes a test, runs it and sees it fail, writes the code, runs the test and sees it pass, then commits.
- Unit tests run in Node. DOM modules use `// @vitest-environment jsdom`. Canvas painters run against a 2D-context stub that records calls.
- Geometry agrees with physics. Tests build each walkable piece (deck, arch, stairs, ramp, landing, summit pool deck, board, beam steps). They call `updateMatrixWorld(true)` and cast a ray down with `THREE.Raycaster` against the walkable meshes only.
  - The legacy geometry does not match `groundH` exactly. Codex measured the ramp midpoint at 9.548 m against 9.45 m, because the tilted box top shifts along z.
  - So each surface has an expected offset and a tolerance, measured once from the legacy geometry and written into the test. The test catches drift from the legacy, not the legacy offsets.
- A headless full-run test (`tests/unit/game/run.test.js`) drives `game.js` from the title to each ending. It uses the stub canvas, scripted input, no renderer, no audio, and the substep rule at a high `ts`. It checks the phase sequence, the skip count and text, and the end text.
- Render order: a unit test runs `renderer.js` against a spy renderer. It checks the call sequence (`setRenderTarget`, `clear`, `render(tScene)`, `clearDepth`, `render(scene)`, five post passes). It checks the two depth ranges in the top phase, and that `tCam.near` and `tCam.far` return to their old values.
- Parity with legacy:
  - `?stage=` uses the stage codes of v26 lines 802-811, with the same meaning.
  - The codes are `W0` to `W3`, `C0` to `C4`, `TOP`, `TIP`, and `BEAM`.
  - Both builds use the world stream in the same order, so a stage gives the same layout and camera pose.
  - The e2e parity test opens the new build and `legacy/it-has-been-years-stages.html` at each stage. CDP `Fetch` serves the three.js CDN request from `node_modules/three/build/three.min.js`.
  - It waits 3 s without input and compares an 8x8 grid of mean colors. If the mean cell difference is above 10/255, or one cell is above 40/255, the test fails.
  - It saves both screenshots and the difference report to `tests/e2e/out/`. This covers the board, the tower rim, and the beam platform views.
- E2E (`npm run e2e`):
  - `tests/e2e/server.js` starts `vite preview` on a free port.
  - `tests/e2e/cdp.js` connects to Brave at `http://localhost:9222`. If nothing listens there, it starts `/usr/bin/brave-browser-stable --remote-debugging-port=9222 --headless=new --user-data-dir=<tmp>`.
  - Each test opens its own target (`PUT /json/new`) and closes it at the end.
  - A test fails on any console error, uncaught exception, or WebGL shader error. Screenshots go to `tests/e2e/out/`.
- Quality gate: `npm run check` runs lint, unit tests, and build. `npm run e2e` needs Brave and runs separately. From task 3 on, both must pass before a task is done.

## Tasks

A Sonnet `implementer` subagent does each task, TDD, on branch `rebuild`, with one commit per task. The brief gives the commit message. The planner (Opus) runs the gates, reads the diff, and then marks the row done. Codex reviewed this plan before task 1. Codex reviews the full diff after task 14.

| # | Task | Legacy lines | Tests that must exist | State |
|---|---|---|---|---|
| 0 | `git init`, commit the original files, create branch `rebuild` (planner, no code) | n/a | n/a | done |
| 1 | Scaffold. Move files to `legacy/` (v26 to `legacy/it-has-been-years-stages.html`). Remove `history/` and `vendor/`. Replace the old `package.json`. Pin deps: vite 8.3.5, vitest 4.1.12, jsdom 30.1.3, three 0.128.0, eslint 10.13.0, @eslint/js 10.0.1, globals 17.13.0. Add `index.html`, `src/ui/style.css`, an empty `main.js`, and `.gitignore` (node_modules, dist, tests/e2e/out). | 1-47 | smoke test, `npm run check` passes | done (9031106) |
| 2 | `core/rng.js`, `core/scheduler.js`, `core/math.js`, `config.js` | 54-55, 67, 173, 400, 448-449, 494, 567, 663-673, 710 | rng equals the legacy formula for the first 5 values of seed 20240607, scheduler order, cancel, clear, time scale | done (3df3c1f) |
| 3 | E2E test tools: `cdp.js`, `server.js`, first e2e test (title text, BEGIN button, zero console errors) | n/a | e2e title test passes against the built preview | done (76b44ff) |
| 4 | `ui/overlay.js` and `input/input.js` | 12-27, 632-660, 675 | curtain timeline classes, hint cancel, end card, key axes, mouse drag look with pitch clamp ±1.5, touch split at half width, joystick radius 55, multi-touch ids | todo |
| 5 | `audio/audio.js`, `audio/sfx.js`, with a fake AudioContext | 579-628, 712-716, 832-838, 885, 901 | each sound does nothing before init, master ramp, duck, tunnel wet levels, wind made once | todo |
| 6 | Pure game logic: `ground.js`, `board.js`, `player.js`, `altitude.js` | 476-491, 631, 709-711, 932-941, 959-989 | ground per segment type and top-phase zones, spring step, clamps per phase with the board entry rule, space, near, and visibility values | todo |
| 7 | `skips.js` (years, subs, actions, jump distances from the `jump` stream) and `path.js` (`pickType`, segment lengths, `ensure` and retire through a builder callback, `clearSegs`, jumpForward regeneration) | 446-475, 663-673, 676, 795-822, 920-931, 945-949 | intro order, early block list, no repeat of the last type, 2.6x growth, climb `climbY` advance, segments retire 320 m behind, clear disposes only non-shared geometry, a skip does not use the `world` stream | todo |
| 8 | `gfx/shaders.js` (GLSL copied without change), `gfx/textures.js`, `gfx/materials.js`, `gfx/geometry.js` | 85-198, 201-217, 414-420, 498-507, 531-535, 557-560, 680-687, 728 | tbox and tcyl UV scale, shared geometry not disposed, painters deterministic with the `paint` stream | todo |
| 9 | `world/segments.js`, `world/structures.js`, `world/climb.js` | 220-411, 421-443, 678-701 | each builder adds meshes, raycast heights match `ground.js` for deck, arch, stairs, ramp, landing | todo |
| 10 | `world/tower.js`, `world/top.js`, `world/planet.js`, `world/eye.js` | 493-576, 717-782, 839-882 | 96 board parts, raycast heights for board, pool deck, and beam steps match `ground.js`, `placeTower` values for i=0 to 3, 6 planet clones | todo |
| 11 | `gfx/post.js`, `gfx/renderer.js` (two scenes, top split, bloom, adaptive quality as a pure `adapt(q, raw)`). A render-only `main.js` draws the far field, path, and tower behind the title screen, with the idle camera of legacy line 1154. | 57-82, 1063-1149, 1154-1159 | adapt thresholds, render call order with a spy renderer, e2e: title canvas has varied pixels, sky color at the top, no GL error | todo |
| 12 | `game/dive.js` and `game/beam.js`: pure cutscene state machines that return the camera pose and events | 883-910, 1002-1039, 1047-1052 | run to tip, crouch at 0.8 and 0.95 s, fly impulse, fall1 for 58.8 s then a skip event, `wakeAtSea` at mid-action, fall2 advances through the curtain, eye open and dilate curves, end event, beam rises through its final curtain and ends at 10 s | todo |
| 13 | `game/game.js`, full `main.js`, `debug.js`. Connect everything. `?stage=` with the v26 codes, `?timescale=N`, and `window.__ihby` hooks (`state()`, `input(fwd,str)`), only with `?debug`. | 702-708, 761-782, 795-831, 890-919, 950-1061, 1150-1172, v26 802-811 | headless full run to both endings, final-skip sequence, debug parser, e2e: each stage renders with zero errors | todo |
| 14 | E2E coverage: full playthrough at `?timescale` to both end cards, touch walking through `Input.dispatchTouchEvent`, parity with `legacy/it-has-been-years-stages.html` at each stage code, frame-time report | n/a | all listed e2e tests pass | todo |
| 15 | Final: Codex review of `main..rebuild`, fixes by an implementer, README.md, fast-forward merge to `main`, final commit | n/a | `npm run check` and `npm run e2e` pass | todo |

## Plan review

Codex reviewed this plan on 2026-11-12. The verdict was APPROVE WITH CHANGES, with 1 BLOCKER, 7 IMPORTANT, and 1 MINOR finding. This plan includes all nine findings:

- per-surface raycast tolerances (the BLOCKER),
- the time-scale substep rule,
- the final-skip sequence,
- cutscenes that advance through curtains,
- a separate `jump` RNG stream,
- the injected canvas factory,
- the render bootstrap, moved to task 11,
- stage parity against v26, plus a render-order test,
- the legacy lines 631, 676, and 709, which had no task.

## Brief template

Each brief gives:

- the goal and the files to create,
- the legacy line ranges to port,
- the tests to write first,
- the gates: `npm run check`, plus `npm run e2e` from task 3 on,
- the commit message,
- the protected paths: `legacy/` and `docs/PLAN.md`,
- the rule: "Do not change any constant, string, or GLSL from the legacy file."

## Verification

- Per task: the planner runs `npm run check` (and `npm run e2e` from task 3 on) and reads `git diff --stat` before the row is marked done.
- At the end: `npm run check` and `npm run e2e` pass. The planner examines the e2e screenshots in `tests/e2e/out/` for each stage, next to the legacy screenshots. This plan records the verdict of the final Codex review.
- The owner checks the game on a real phone, because WebGL precision and bloom need a real GPU. The planner gives the `npm run dev -- --host` command and the stage URLs.

## Risks

- Brave on port 9222 runs headless, so WebGL can use SwiftShader (software rendering). E2E checks correctness and errors, not frame rate. Visual quality needs an owner check on a device.
- The legacy textures use `Math.random`. The seeded version changes the tile tint noise a small amount. This is within "same experience".
- Floating-point precision at the 1e6 to 3e8 scale: the port keeps every offset (CX, farSlab, the two depth ranges) unchanged.
