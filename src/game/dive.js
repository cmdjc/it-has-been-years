import { Vector3 } from "three";
import { OCEAN_Y, PATH, TOP } from "../config.js";
import { clamp, ramp, smooth, wrapPi } from "../core/math.js";

const { BOARD_L, PLANET_R, EYE_R } = TOP;

export const startDive = ({ x, z, pitch }) => ({
  t: 0, x, z, wy: 0, vy: 0, vz: 0, pitch, phase: "run", tc: 0, tf: 0,
  stage: "fall1", skipped: false, eyeDone: false, rumbled: false, fin: false, t2: 0,
  eye: { visible: false, pos: new Vector3(), look: new Vector3(0, 1, 0), open: 0, dil: 0.2 },
});

export const stepDive = (D, dt, { yaw: yawIn, boardY, planetPos }) => {
  const events = [];
  let yaw = yawIn;
  D.t += dt;
  const tipZ = -(698 + BOARD_L) + 0.4;
  if (D.phase === "run") {
    D.z = Math.max(tipZ, D.z - 3.6 * dt);
    D.x += (0 - D.x) * Math.min(1, dt * 3);
    yaw -= wrapPi(yaw) * Math.min(1, dt * 2.5);
    D.wy = boardY(D.z) + 1.62 - Math.abs(Math.sin(D.t * 7)) * 0.03;
    D.pitch += (-0.1 - D.pitch) * Math.min(1, dt * 2);
    if (D.z <= tipZ) { D.phase = "crouch"; D.tc = D.t; }
  } else if (D.phase === "crouch") {
    const k = Math.min(1, (D.t - D.tc) / 0.8);
    D.wy = boardY(D.z) + 1.62 - 0.32 * k * k;
    if (D.t - D.tc >= 0.95) {
      D.phase = "fly";
      D.tf = D.t;
      events.push({ type: "kick", boardV: 6 }, { type: "boing", a: 1 });
      D.vy = 7.5;
      D.vz = -3.4;
      D.wy = Math.max(D.wy, 0.6 + 1.3);
    }
  } else {
    const ft = D.t - D.tf;
    D.pitch += (-1.45 - D.pitch) * Math.min(1, dt * 0.9);
    if (ft < 1.2) {
      D.vy -= 9.8 * dt;
      D.wy += D.vy * dt;
      D.z += D.vz * dt;
      D.y1 = D.wy;
      D.z1 = D.z;
    } else if (D.stage === "fall1") {
      const u = Math.min(1, (ft - 1.2) / 58.8);
      const v = Math.pow(u, 2.2);
      D.wy = D.y1 - 10e6 * v;
      D.z = D.z1 - 4.5e6 * Math.pow(v, 1.5);
      events.push({ type: "wind", gain: Math.min(0.16, 0.03 + 0.0023 * ft) });
      if (u >= 1 && !D.skipped) {
        D.skipped = true;
        D.stage = "skip";
        events.push({ type: "diveSkip" });
      }
    } else if (D.stage === "fall2") {
      D.t2 += dt;
      const t2 = D.t2;
      const hS = 3e7;
      const hE = 1.15 * EYE_R + 3;
      const sN = Math.min(1, t2 / 28);
      const e = Math.pow(sN, 2.0);
      const hC = hS - (hS - hE) * e;
      D.camv.copy(planetPos).addScaledVector(D.u, PLANET_R + hC);
      const rs = smooth(clamp((t2 - 0.5) / 12, 0, 1));
      D.eye.pos.copy(planetPos).addScaledVector(D.u, PLANET_R - EYE_R + rs * 1.15 * EYE_R);
      D.eye.look.copy(D.camv).sub(D.eye.pos).normalize();
      D.eye.open = smooth(ramp(t2, 5, 19));
      D.eye.dil = 0.2 + 0.8 * ramp(t2, 10, 24);
      if (t2 > 1.5 && !D.rumbled) { D.rumbled = true; events.push({ type: "rumble" }); }
      events.push({ type: "wind", gain: 0.12 });
      if (sN >= 1 && !D.eyeDone) { D.eyeDone = true; events.push({ type: "eyeDone" }); }
    }
  }
  if (D.phase === "fly" && D.eyeDone && !D.fin) {
    D.fin = true;
    events.push({ type: "final" });
  }
  const pose = D.stage === "fall2"
    ? { kind: "look", position: D.camv, target: D.eye.pos, up: [0, 0, -1] }
    : { kind: "euler", x: D.x + PATH.CX, y: D.wy, z: D.z, pitch: D.pitch, yaw, roll: D.phase === "fly" ? Math.sin(D.t * 0.7) * 0.03 : 0 };
  return { pose, events, yaw };
};

export const wakeAtSea = (D, { skipAlt, planetPos }) => {
  const ph = 1.1e7 / PLANET_R;
  D.u = new Vector3(0, Math.cos(ph), -Math.sin(ph));
  D.camv = new Vector3();
  D.stage = "fall2";
  D.t2 = 0;
  D.wy = OCEAN_Y - skipAlt + 3e7;
  D.z = D.z1 - 1.1e7;
  D.eye.visible = true;
  D.eye.pos.copy(planetPos).addScaledVector(D.u, PLANET_R - EYE_R);
  D.eye.open = 0;
  D.eye.dil = 0.2;
  return [{ type: "wind", gain: 0.02 }];
};
