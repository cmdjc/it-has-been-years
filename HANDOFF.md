# Fear Games — Handoff

Four browser games, each a **single self-contained HTML file** (inline CSS + JS, three.js r128 from a CDN, all textures/audio generated procedurally at runtime). There are **no binary game assets** — no images, models, or audio files. Everything is code. The goal of this handoff is to turn these into a proper multi-file JS/HTML project (suggested: Vite + ES modules).

The owner's working style: they test on a **phone/tablet** (touch joystick) and desktop, give short feedback ("too dark", "still a bit long"), and want Claude to **keep asking questions with multiple-choice prompts between steps**.

---

## 1. Package layout

```
fear-games/
├─ HANDOFF.md                  ← this file
├─ package.json                ← "npm run serve" static server over games/
├─ vendor/three.r128.min.js    ← same three.js build the games load from cdnjs
├─ games/
│  ├─ it-has-been-years/index.html   ← MAIN PROJECT, finished (debug buttons removed)
│  ├─ the-long-bridge/index.html     ← creature walk; unfinished, paused
│  ├─ open-late/index.html           ← uncanny-valley department store; never playtested by owner
│  └─ small-warm-room/index.html     ← cozy submarine (latest = v4)
├─ history/
│  ├─ it-has-been-years/v1…v26.html  ← incremental backups (v26 = final, == games/ copy)
│  └─ small-warm-room/v1…v4.html
└─ reference/screenshots/            ← owner's bug-report screenshots (all already fixed)
```

Games currently load three.js from
`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`. To work offline, change the `<script src>` to `../../vendor/three.r128.min.js`. In a Vite project, `npm i three@0.128.0` and `import * as THREE from "three"` (keep r128 — the post pipeline uses `THREE.WebGLMultisampleRenderTarget`, which was removed in later releases).

To run now: `cd fear-games && npm run serve`, then open `http://localhost:5173/it-has-been-years/`.

---

## 2. Shared patterns (identical or near-identical across all four games)

| Pattern | Notes |
|---|---|
| **Controls** | Touch: left half of screen = virtual joystick (walk), right half = drag to look. Desktop: WASD + mouse drag (+ Shift to run in IHBY). DOM: `#joy`, `#knob`. Functions `look`, `endTouch`. |
| **Procedural textures** | `canvasTex(w,h,drawFn)` makes a `THREE.CanvasTexture` from 2D canvas drawing. All tiles, wood, plaid, faces, signs are drawn this way. |
| **Seeded RNG** | `rand` (mulberry-style). Keep seeding deterministic so worlds are reproducible. |
| **Procedural audio** | WebAudio only: `initAudio`, `nBuf` (noise buffer), `out`, `loopNoise`, `burst`, `stepSound`, `chime`, `duck`. No audio files. Audio must start on the BEGIN button tap (autoplay policy). |
| **Screens** | `#start` (title + BEGIN `#go`) and `#end` (end card + `#again`, which just does `location.reload()`). |
| **Game loop** | `frame()` → `update(dt)` → render. `clock` = `THREE.Clock`. |
| **Streaming world** | Games with long walks generate segments/chunks ahead of the player (`ensure`, `addSegment`/`buildChunk`) and dispose those behind (`disposeGroup`, `removeChunk`). |

Good first refactor targets when modularizing: `audio.js`, `input.js` (touch+kb), `textures.js`, `ui.js` (start/end screens, hints), then per-game folders.

---

## 3. Game 1 — **It Has Been Years** (main, finished)

**Concept (fear: megalophobia):** a calm, sterile poolrooms-tile ocean. A ~1000 km-wide tower stands on the horizon. Every so often the screen goes white with text like *"It has been 4 years"* and you are teleported much closer. You walk to the tower, climb it, reach a summit with a diving board and a light beam, and choose one of two endings.

**Tone:** sterile, peaceful, dreamlike. Text-only narration. Palette teal/white (`--ink:#0f4c57`, `--paper:#f6fcfc`).

### 3.1 Flow
1. **Walk phase (W0–W3)** — procedural segments (`buildWalk, buildArch, buildStairs, buildTunnel, buildPool, buildColonnade, buildGate, buildAtrium`, chosen by `pickType`). Tower starts as just the spire tip on the horizon. `YEARS`/`SUBS` drive the "It has been X years" skips; each skip calls `placeTower(i)` to stage the tower closer (`T_D=[1.4e8,4e7,1.6e7,6.5e6]`, `T_VIS=[9e6,4e7,9.2e7,9.2e7]`).
2. **Climb phase** — `enterClimb()` builds `climbG` at x=`CX`=30000: ramps/landings (`buildRamp, buildLanding, addClimbSeg`), a base walkway behind you (`buildClimbBase`, `dropBase`), a wall (`makeWall`), altitude-driven sky/space shader (`applyAlt`, `ALTS`). 5 skips (`CLIMB_YEARS`, `CLIMB_SUBS`).
3. **Top phase** — `enterTop()`/`buildTop()`: summit with a spring **diving board** (`BOARD_L=1000`, `boardX/boardV` spring physics, `boing`, `boardParts`), signposts ("diving board", "beam"), and a small **beam platform** with steps at `BEAM_Z≈1.0029e6`. `TOP_AT=[-330,-950]`, `TOP_JUMP=[150,400]`, `TOP_Y`, `TOP_SUB` define the one/two mid-board skips.
4. **Ending A — dive:** walk off the board → `startDive` cutscene: run → crouch → fly. Stages: `fall1` → skip (`diveSkip`, `wakeAtSea`) → `fall2` over a small planet sphere (`planetMesh`, `PLANET_R=4e7`) where a matt-black scaled creature face with one **orange eye** (`makeEye`, `eyeMesh`, shader uniforms `open`/`dil`, `EYE_R=5e6`) rises from the sea and opens. Text via `endText`.
5. **Ending B — beam:** stand in the beam → `startBeam`: CSS radial-glow overlay `#bfx`, camera ascends, end card *"You went up the light."*

### 3.2 Rendering architecture (the hard part — read before touching)
- **Two scenes, one frame.** The tower is huge (scaled `TS=8`, placed at `TZ=-12e6`) while floor tiles are ~1 cm detail. Depth precision cannot cover both, so:
  - far scene `tScene`/`tCam`: sky, ocean (`seaFar`), tower group `towerG`, planet.
  - near scene `scene`/`camera`: tiles, structures, player-scale geometry.
  - Render far, `clearDepth`, then render near.
  - In the **top phase** the far scene is rendered in **two depth ranges** (near 1e5..3e8, then 2..2.5e5) to prevent see-through tower walls.
- **Planet-sphere sea** (`planetMat`/`planetC`) gives visible horizon curvature at altitude.
- **Post pipeline** (`pass`, `render`): MSAA render target → bright-pass → blur chain (bloom) → final shader (chromatic aberration, grade, vignette, grain). `renderReflection` exists but is **disabled** (`planar = false`); owner decided water should be smooth/dark, not reflective.
- **Water** (`waterMaterial`, `seaNear`, `poolWater`): glossy, dark, opaque; "can't see a centimetre down." Colour was lightened in four small steps at the owner's request — don't darken it again.
- **Skips are cheap:** `jumpForward` clears and regenerates segments rather than building the skipped stretch.
- Known numerics: floating-point precision is the recurring enemy. Keep the player near the origin where possible; the board uses `farSlab` kept at z=80000 unless player z > 50000.

### 3.3 Tuning constants the owner has iterated on
- Walk speed 3.6 (6 with Shift). (A debug `superSpeed` ×8 existed; removed with the debug buttons.)
- `BOARD_L=1000` (was 100× longer originally; owner said "still a bit long" twice → shortened to ~1.5 km-feel with only 1–2 skips, mid-skip moved earlier).
- Wake height after the dive skip raised, and approach to the eye lengthened (owner: "puts you centimeters from the eye").
- Fall slowed down ("it's 10000 km tall but with skip").
- Tower beam emanates from the spire(s); beam is small with a couple of steps leading to it.

### 3.4 Bugs already fixed (do not regress)
z-fighting between waterfall strips and the giant door plane (flickering pillar at W3) · halo/pixelated glow at summit (beacon/top rings hidden at summit, rings open-ended) · seeing through tower from the board / noclip through board · climb start with "stairs and nothing behind you" · missing `burst` helper · sign pole through letters (pole moved to x=-1.38) · 2D tile slab visible under the board · speckled beam interior (replaced by `#bfx` overlay, `beamMesh` hidden during ascent).

### 3.5 Debug/testing
The temporary stage-jump buttons (`#dbg`, `dbgGo`) were **removed** at the owner's request ("Remove temporary buttons / call it finished"). `resetWorld()` is now unused (safe to delete or reuse for a dev menu). When modularizing, a `?debug=` URL flag that re-adds stage jumps would be a clean replacement.

Headless test recipe used during development (not included): `puppeteer-core` + `@sparticuz/chromium` (SwiftShader WebGL), request-intercept the three.js CDN URL to a local file, inject test hooks into the HTML string at test time, and verify the title screen, touch walking, and zero console errors. Real-GPU behaviour (precision, bloom) is only trustworthy on a device — ask the owner to confirm visual changes.

---

## 4. Game 2 — **The Long Bridge** (unfinished)
First game (fear: megalophobia, colossal creature). Walk a very long steel bridge over a void; a giant walking creature (`walker`, `legs`, `head`, `eyeMeshes`, `bodyDisp`) approaches; dread builds through a head-standoff moment; ends via `runEnding`. Scripted beats in `script`/`pending`/`fired`; sounds `thump, groan, breath, footfall, pulse`. Brightness was raised across several rounds ("way too dark" → "good now"). Last feedback: **"Too much, ease it back"** after adding more dread — the tension was dialed back but the game was not declared finished. Note: this file changed on disk between sessions; treat the current version as intentional.

## 5. Game 3 — **Open Late** (never reviewed)
Fear: uncanny valley. A department store after hours, cold fluorescent and sterile; smiling mannequin-like figures that **almost** speak (formant-based "almost speech" audio, `voice`, `setMouth`, `makeFig`, `drawFace`); PA announcements (`PA`, `paDone`); department signage (`DEPTS`, `SIGN`); chunked level (`plan`, `chunks`, `buildChunk`). Ending line: *"Can I help you?"* (`startEnding`, `runEnding`). **Syntax-checked only — never run in a browser or seen by the owner.** First task for a new session: playtest it, then ask the owner for feedback.

## 6. Game 4 — **Small Warm Room** (cozy submarine, thalassophobia)
Fear: thalassophobia. A two-room lamplit submarine full of clutter; descend to the bottom and reach a safe habitat while something enormous, only partly seen, passes; **hide in cover** (`goCover`, `leaveCover`) when it does. Features sonar (`drawSonar`), depth gauge, radio calls, hull integrity (`hitHull`, `die`), log entries (`LOG`), creature (`updateCreature`, `SEG`, glowing eyes), glowing light switches (`mkSwitch`, `swMat`, `swGlow`), nightlight (`nightL`).
Version notes: v2 fixed a duplicate-identifier crash (`T` → `WT`; the owner's browser had a stale cache, hence new filenames). v3/v4 respond to "can't find the light switch in the dark / still struggle to see in the dark": glowing switches, baseline ambient glow, nightlight. **Open question to the owner:** "what's the jumpscare, if any?" — unanswered.

---

## 7. Suggested modernization plan

1. `npm create vite@latest` (vanilla JS), `npm i three@0.128.0`.
2. Extract per game: `index.html` shell + `style.css` + `main.js`, then split `main.js` into modules (`audio`, `input`, `textures`, `world/*`, `phases/*`, `post/*` for IHBY).
3. Keep behaviour identical first (diff screenshots on a real device), then refactor.
4. Share common code in `src/shared/` (audio, input, texture helpers, start/end UI) and give each game its own entry (Vite multi-page config).
5. Add a `?debug` flag for stage jumps instead of shipping buttons.
6. Optional: lint with ESLint; consider deleting `history/` once git is initialised (it is a manual stand-in for version control).

## 8. Gotchas
- three.js must stay at **r128**.
- Mobile Safari/Chrome: audio unlocks only after a user gesture; viewport meta disables zoom; joystick relies on touch events (`pointer-events:none` overlay).
- Never put `T` or other short generic names at top scope across merged files — the duplicate-`T` crash happened once already; use modules.
- Browser caching bit the owner once; use new filenames or cache-busting query strings when delivering a fix.
- Owner feedback loop: after each delivery, ask a multiple-choice question about what to do next.

## 9. Immediate next steps
1. Set up the Vite project and port **It Has Been Years** first (finished, most valuable).
2. Playtest **Open Late**.
3. Decide the **Small Warm Room** jumpscare and re-check dark visibility.
4. Decide whether **The Long Bridge** is done or needs more tuning.
