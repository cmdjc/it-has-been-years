# It Has Been Years

A short first-person browser game about scale. You walk across a calm ocean of pool tiles toward a tower that is about 1000 km wide. From time to time the screen goes white and tells you how many years passed, and you are much closer. You climb the tower, reach a diving board at the top, and choose one of two endings.

All textures and sounds are made by code at runtime. The project has no image, model, or audio files.

## Controls

- Touch: the left half of the screen is a joystick for walking. Drag on the right half to look.
- Keyboard and mouse: WASD or the arrow keys walk, Shift runs, and you drag the mouse to look.

## Requirements

- Node.js 22.12 or later.
- For e2e tests only: Brave at `/usr/bin/brave-browser-stable`.

## Commands

Install the dependencies from the lock file:

```sh
npm ci
```

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server. |
| `npm run dev -- --host` | Starts the dev server on your network, so you can open it on a phone. |
| `npm run build` | Writes a static build to `dist/`. Any static file host can serve it. |
| `npm run preview` | Serves `dist/` locally. |
| `npm run check` | Runs lint, the unit tests, and the build. Run it before each commit. |
| `npm run e2e` | Builds the game and runs the browser tests. |

## Debug flags

Add these query parameters to the game URL:

- `?stage=CODE` jumps to a stage at load. Walk codes are `W0` to `W3`, and climb codes are `C0` to `C4`. `TOP` is the summit, `TIP` is the end of the diving board, and `BEAM` is in front of the light beam.
- `?timescale=N` runs the game N times faster. Only tests use it.
- `?debug` exposes `window.__ihby` with `state()`, `input(axes)`, and `stage(code)` for the e2e tests. Without it, the game exposes no globals.

For example, `http://localhost:5173/?stage=TIP` starts at the end of the diving board.

## Tests

The unit tests (Vitest) cover every module in `src/`. Pure game logic has direct tests. Mesh builders are tested in Node with a stub canvas, and raycasts check that each walkable surface matches the ground function that the player uses. A headless test plays the whole game to both endings.

The e2e tests talk to Brave through the Chrome DevTools Protocol, with the built-in `WebSocket` of Node. They need no Playwright or Puppeteer.

- If Brave already listens on port 9222, the tests use it. Otherwise they start `brave-browser-stable --headless=new --remote-debugging-port=9222` with a temporary profile.
- Each test opens its own tab and closes it after. A console error or a WebGL error fails the test.
- The parity test opens each stage in this build and in the original game, `legacy/it-has-been-years-stages.html`. It compares the two screenshots on an 8x8 color grid.
- The playthrough tests play both endings at 20 times speed.
- Screenshots and reports go to `tests/e2e/out/`, which git ignores.

## Layout

```
index.html          page shell
src/main.js         bootstrap and frame loop
src/config.js       every tuned constant
src/core/           seeded RNG, game-clock scheduler, math helpers
src/game/           pure game logic: player, ground, board, skips, dive, beam, and game.js, which connects them
src/world/          mesh builders: path, segments, structures, climb, tower, summit, planet, eye
src/gfx/            shaders, canvas textures, materials, two-scene renderer, bloom pipeline
src/audio/          WebAudio engine and sound effects
src/ui/, src/input/ DOM overlay, keyboard, mouse, and touch input
tests/unit/         Vitest tests, one file per module
tests/e2e/          CDP client, test server, browser tests
docs/PLAN.md        the rebuild plan, with the state of each task
legacy/             the original single-file game, three other prototype games, and the old handoff notes
```

## Rendering notes

The tower is about 1000 km tall, and the floor tiles are a few centimeters. One depth buffer cannot hold both scales. So each frame draws a far scene (sky, sea, tower, planet) first, clears the depth buffer, and then draws the near scene. At the summit the far scene draws in two depth ranges. three.js stays at version 0.128.0, because the bloom pipeline uses `WebGLMultisampleRenderTarget`, which later versions removed.
