import * as THREE from "three";
import { HINTS, PATH, SKIPS, START, TIMELINE, TOP } from "../config.js";
import { clamp } from "../core/math.js";
import { disposeGroup } from "../gfx/geometry.js";
import { buildStart } from "../world/structures.js";
import { createPath } from "../world/path.js";
import { createSegmentBuilder } from "../world/builder.js";
import { buildClimbBase, followWall, makeWall } from "../world/climb.js";
import { makeEye } from "../world/eye.js";
import { makePlanet, stageTop } from "../world/planet.js";
import { bendBoard, buildTop, placeFarSlab } from "../world/top.js";
import { buildTower, placeTower, setBeamR } from "../world/tower.js";
import { altitude, needsNear } from "./altitude.js";
import { startBeam, stepBeam } from "./beam.js";
import { boardShape, boardTarget, stepBoard } from "./board.js";
import { startDive, stepDive, wakeAtSea } from "./dive.js";
import { groundHeight } from "./ground.js";
import { createPlayerState, flyHeight, followGround, stepGait, stepPlayer } from "./player.js";
import {
  backSkip, climbSkip, curtainSteps, jumpDistance, nextSkipAt, pendingEvent, topSkip, walkSkip, yearsText,
} from "./skips.js";

const { CX } = PATH;
const { BOARD_L, BEAM_Z } = TOP;
const ALTS = SKIPS.ALTS;
const STAGE_CODE = /^(?:W[0-3]|C[0-4]|TOP|TIP|BEAM)$/;

export function createGame({ view, mats, kit, overlay, engine, sfx, scheduler, rng }) {
  const { camera, tCam, seaNear, seaFar } = view;
  const state = {
    ...createPlayerState(),
    phase: "walk", started: false, skipping: false, skipN: 0, climbSkips: 0, topSkipI: 0, backSkipI: 0,
    backNext: 400, nextSkip: 260, finalDone: false, skipAlt: 0, board: { x: 0, v: 0 }, dive: null,
    beamEnd: null, time: 0, inTunnel: false,
  };

  let options = { speed: 1, fly: false };
  const setOptions = ({ speed, fly }) => { options = { speed, fly }; };

  const world = new THREE.Group();
  view.scene.add(world);
  world.add(buildStart(kit, rng.world));

  let climbG = null;
  let climbBase = null;
  let wall = null;
  let top = null;
  let eye = null;

  const buildSegment = createSegmentBuilder(kit, rng.world);
  const path = createPath({
    rng: rng.world,
    build: (spec) => {
      const group = buildSegment(spec);
      (spec.mode === "climb" ? climbG : world).add(group);
      return group;
    },
    remove: (group) => {
      group.parent.remove(group);
      disposeGroup(group);
    },
  });

  const tower = buildTower(mats);
  view.tScene.add(tower.group);
  placeTower(tower, view.tScene.fog, 0);
  const planet = makePlanet(mats);
  view.tScene.add(planet);
  path.ensure(state.player.z);

  const dropBase = () => {
    if (!climbBase) return;
    climbG.remove(climbBase);
    disposeGroup(climbBase);
    climbBase = null;
  };

  const placePlayer = (z, pitch) => {
    Object.assign(state.player, { x: 0, y: 0, z });
    state.yaw = 0;
    state.pitch = pitch;
  };

  function enterClimb() {
    path.enterClimb();
    state.phase = "climb";
    if (!climbG) {
      climbG = new THREE.Group();
      climbG.position.x = CX;
      view.scene.add(climbG);
    }
    if (!wall) {
      wall = makeWall(mats);
      view.scene.add(wall.mesh);
    }
    wall.mesh.visible = true;
    tower.group.visible = false;
    dropBase();
    climbBase = buildClimbBase(kit);
    climbG.add(climbBase);
    placePlayer(14, 0.25);
    const [text, delay] = HINTS.climb;
    scheduler.after(delay, () => overlay.hint(text));
  }

  function enterTop() {
    dropBase();
    path.clear();
    wall.mesh.visible = false;
    state.phase = "top";
    state.skipAlt = ALTS[4];
    top = buildTop(kit, rng.world);
    climbG.add(top.group, top.beamPad, top.farSlab);
    state.board.x = 0;
    state.board.v = 0;
    placePlayer(40, 0.12);
    stageTop({ tower, planet, seaFar, fog: view.tScene.fog, tScene: view.tScene, mats });
    HINTS.top.forEach(([text, delay]) => scheduler.after(delay, () => overlay.hint(text)));
  }

  function jumpForward(distance) {
    const { player } = state;
    player.z -= distance;
    if (state.phase === "top") player.z = Math.max(-(698 + BOARD_L - 4), player.z);
    else path.regenerate(player.z, distance);
    player.y = groundHeight({ phase: state.phase, x: player.x, z: player.z, seg: path.segAt(player.z), boardX: state.board.x });
  }

  function curtain(years, sub, onMid, final) {
    state.skipping = true;
    overlay.setText(yearsText(years), sub);
    const actions = {
      on() {
        overlay.curtainOn();
        engine.duck(...TIMELINE.DUCK_LOW);
      },
      mid() {
        overlay.textOn();
        sfx.chime();
        onMid();
      },
      textOff: () => overlay.textOff(),
      off() {
        overlay.curtainOff();
        engine.duck(...TIMELINE.DUCK_UP);
      },
      unlock() {
        state.skipping = false;
      },
      end: () => overlay.showEnd(final.end),
    };
    curtainSteps(final).forEach(([delay, step]) => {
      if (delay === 0) actions[step]();
      else scheduler.after(delay, actions[step]);
    });
  }

  function triggerSkip(finalKey) {
    let info;
    if (finalKey) info = SKIPS.FINAL[finalKey];
    else if (state.phase === "walk") info = walkSkip(++state.skipN);
    else if (state.phase === "climb") info = climbSkip(++state.climbSkips);
    else {
      info = topSkip(state.topSkipI);
      state.topSkipI++;
    }
    const onMid = () => {
      if (info.arrive === "climb") enterClimb();
      else if (info.arrive === "top") enterTop();
      else if (info.alt !== undefined) {
        state.skipAlt = info.alt;
        dropBase();
      }
      if (state.phase === "walk") placeTower(tower, view.tScene.fog, Math.min(3, state.skipN));
      if (!info.arrive && !finalKey) jumpForward(jumpDistance(state.phase, state.topSkipI, rng.jump));
      state.nextSkip = nextSkipAt(state.walked, state.phase, rng.jump);
    };
    curtain(info.years, info.sub, onMid, finalKey ? info : null);
  }

  function runBackSkip() {
    const info = backSkip(state.backSkipI++);
    curtain(info.years, info.sub, () => {
      if (info.last) {
        Object.assign(state.player, { x: 0, z: BEAM_Z - 25 });
        state.yaw = Math.PI;
        state.pitch = 0.05;
        state.backNext = 1e12;
      } else {
        state.player.z += info.jump;
        state.backNext = state.player.z + 800;
      }
    }, null);
  }

  function diveSkip() {
    const { years, sub } = SKIPS.DIVE;
    curtain(years, sub, () => {
      wakeAtSea(state.dive, { skipAlt: state.skipAlt, planetPos: planet.position })
        .forEach((event) => sfx.wind(event.gain));
    }, null);
  }

  function startDiveScene() {
    const { player, pitch } = state;
    state.dive = startDive({ x: player.x, z: player.z, pitch });
    overlay.hintOff();
    if (!eye) {
      eye = makeEye();
      view.tScene.add(eye);
    }
    eye.visible = false;
  }

  function startBeamScene() {
    state.beamEnd = startBeam(state.pitch);
    overlay.hintOff();
    tower.beam.visible = false;
    overlay.beamGlow(0.95);
    sfx.beamChord();
  }

  const applyEuler = ({ x, y, z, pitch, yaw, roll }) => {
    camera.position.set(x, y, z);
    camera.rotation.set(pitch, yaw, roll);
  };

  function applyAltitude() {
    const a = altitude({ phase: state.phase, skipAlt: state.skipAlt, playerY: state.player.y });
    mats.uniforms.space.value = a.space;
    seaNear.position.y = a.seaY;
    seaFar.position.y = a.seaY;
    world.position.y = a.worldY;
    seaNear.visible = a.worldVisible;
    world.visible = a.worldVisible;
    if (needsNear(tCam.near, a.tNear)) {
      tCam.near = a.tNear;
      tCam.updateProjectionMatrix();
    }
    engine.setSea(a.seaLevel);
  }

  const diveHandlers = {
    kick: (event) => { state.board.v += event.boardV; },
    boing: (event) => sfx.boing(event.a),
    wind: (event) => sfx.wind(event.gain),
    diveSkip,
    rumble: () => sfx.burst(4.0, 100, 0.45, 0.9, "lowpass"),
    eyeDone() {
      sfx.burst(1.4, 2600, 0.3, 0.5, "bandpass");
      sfx.burst(2.0, 140, 0.5, 0.9, "lowpass");
    },
    final: () => triggerSkip("dive"),
  };

  function updateDive(dt) {
    const D = state.dive;
    const { pose, events, yaw } = stepDive(D, dt, {
      yaw: state.yaw,
      boardY: (z) => 0.6 + state.board.x * boardShape(-698 - z),
      skipAlt: state.skipAlt,
      planetPos: planet.position,
    });
    state.yaw = yaw;
    if (pose.kind === "look") {
      camera.position.copy(pose.position);
      camera.up.set(...pose.up);
      camera.lookAt(pose.target);
      camera.up.set(0, 1, 0);
    } else applyEuler(pose);
    eye.visible = D.eye.visible;
    eye.position.copy(D.eye.pos);
    const { look, open, dil } = eye.material.uniforms;
    look.value.copy(D.eye.look);
    open.value = D.eye.open;
    dil.value = D.eye.dil;
    events.forEach((event) => diveHandlers[event.type](event));
  }

  function updateBeam(dt) {
    const { player } = state;
    const { pose, events } = stepBeam(state.beamEnd, dt, { x: player.x, y: player.y, z: player.z, yaw: state.yaw });
    applyEuler(pose);
    if (events.some((event) => event.type === "final")) triggerSkip("beam");
  }

  const triggers = {
    topSkip: () => triggerSkip(),
    dive() {
      state.finalDone = true;
      startDiveScene();
    },
    back: runBackSkip,
    beam: startBeamScene,
    skip: () => triggerSkip(),
  };

  function update(dt, input) {
    const { player, board } = state;
    state.time += dt;
    mats.uniforms.time.value = state.time;
    mats.causticTex.offset.x += dt * 0.02;
    mats.causticTex.offset.y += dt * 0.013;
    const frozen = state.skipping || state.dive || state.beamEnd;
    stepPlayer(state, frozen ? { fwd: 0, str: 0, run: false } : input, dt, options.speed);
    if (state.phase !== "top") path.ensure(player.z, 1);
    const seg = path.segAt(player.z);
    state.inTunnel = Boolean(seg) && (seg.type === "tunnel" || seg.type === "atrium");
    if (state.phase === "top") {
      stepBoard(board, boardTarget({ x: player.x, z: player.z, divePhase: state.dive?.phase }), dt);
      bendBoard(top.boardParts, board.x);
    }
    const groundY = groundHeight({ phase: state.phase, x: player.x, z: player.z, seg, boardX: board.x });
    if (options.fly) player.y = flyHeight(player.y, groundY, frozen ? 0 : input.rise ?? 0, dt, options.speed);
    else followGround(state, groundY, dt);
    const { stepped, bob } = stepGait(state, dt, options.speed);
    if (stepped) {
      sfx.step(state.inTunnel);
      if (state.phase === "top" && player.z < -696) {
        const shape = boardShape(-698 - player.z);
        board.v -= 1.5 * shape;
        sfx.boing(shape);
      }
    }
    camera.position.set(player.x + (state.phase === "walk" ? 0 : CX), player.y + 1.7 - bob, player.z);
    if (state.phase === "climb") followWall(wall, camera.position.y, player.z);
    applyAltitude();
    camera.rotation.set(state.pitch, state.yaw, 0);
    if (state.dive) updateDive(dt);
    if (state.phase === "top" && !state.beamEnd) {
      setBeamR(tower.beam, clamp(0.0018 * Math.hypot(player.x, player.z - BEAM_Z), 0.9, 3e4));
      placeFarSlab(top.farSlab, player.z);
    }
    if (state.beamEnd) updateBeam(dt);
    const event = pendingEvent(state);
    if (event) triggers[event]();
  }

  function skipNow() {
    if (!state.started || state.skipping || state.dive || state.beamEnd) return false;
    if (state.phase === "top" && state.topSkipI >= SKIPS.TOP_AT.length) return false;
    triggerSkip();
    return true;
  }

  function begin() {
    engine.init();
    overlay.hideStart();
    state.started = true;
    scheduler.after(START.CURTAIN_OFF, () => overlay.curtainOff());
    scheduler.after(START.HINT_ON, () => overlay.hintOn());
    scheduler.after(START.HINT_OFF, () => overlay.hintOff());
  }

  function idle(dt) {
    mats.uniforms.time.value += dt;
    path.ensure(14);
    camera.position.set(0, 1.7, 14);
    camera.rotation.set(0.03, 0, 0);
  }

  function look(dYaw, dPitch) {
    state.yaw += dYaw;
    state.pitch = clamp(state.pitch + dPitch, -1.5, 1.5);
  }

  function stage(code) {
    if (!STAGE_CODE.test(code)) throw new Error(`Unknown stage code: ${code}`);
    if (!state.started) begin();
    path.clear();
    overlay.curtainOff();
    overlay.textOff();
    placePlayer(14, 0.03);
    state.skipping = false;
    const k = Number(code[1]);
    if (code[0] === "W") {
      state.phase = "walk";
      Object.assign(path.state, { segCount: 0, lastType: "", genZ: 0, mode: "walk" });
      state.skipN = k;
      state.walked = 0;
      state.nextSkip = 260;
      placeTower(tower, view.tScene.fog, k);
    } else if (code[0] === "C") {
      enterClimb();
      if (k > 0) {
        state.climbSkips = k;
        state.skipAlt = ALTS[k - 1];
        dropBase();
      }
      state.walked = 0;
      state.nextSkip = 170;
    } else {
      enterClimb();
      enterTop();
      state.walked = 0;
      if (code !== "TOP") state.topSkipI = SKIPS.TOP_AT.length;
      if (code === "TIP") {
        state.player.z = -(698 + BOARD_L - 80);
        state.player.y = 0.6;
      } else if (code === "BEAM") {
        state.backSkipI = SKIPS.BACK_JUMP.length;
        state.player.z = BEAM_Z - 30;
        state.yaw = Math.PI;
      }
    }
  }

  return { state, begin, idle, look, update, stage, setOptions, skipNow };
}
