import { SPEED, TOP } from "../config.js";
import { clamp } from "../core/math.js";

export const createPlayerState = () => ({
  player: { x: 0, y: 0, z: 14 },
  yaw: 0,
  pitch: 0.03,
  speedNow: 0,
  stepPhase: 0,
  lastSin: 0,
  walked: 0,
});

const clampWalk = (player, nx, nz) => {
  if (player.z > 0 && nz <= 0 && Math.abs(nx) > 3.2) nz = player.z;
  const halfWidth = nz > 0 ? 6.4 : 3.2;
  return [clamp(nx, -halfWidth, halfWidth), Math.min(23, nz)];
};

const clampClimb = (nx, nz) => [clamp(nx, -3.2, 3.2), Math.min(23, nz)];

const clampTop = (player, nx, nz) => {
  if (nz < -693.5) {
    if (player.z >= -693.5 && Math.abs(nx) > 0.55) nz = -693.5;
    return [clamp(nx, -0.55, 0.55), Math.max(-(698 + TOP.BOARD_L - 4), nz)];
  }
  const lim = nz < -420 && nz > -620 ? 2 : 150;
  return [clamp(nx, -lim, lim), Math.min(TOP.BEAM_Z + 60000, nz)];
};

export const stepPlayer = (s, input, dt) => {
  let { fwd, str } = input;
  const m = Math.hypot(fwd, str);
  if (m > 1) { fwd /= m; str /= m; }
  s.speedNow += (Math.min(1, m) * (input.run ? SPEED.RUN : SPEED.WALK) - s.speedNow) * Math.min(1, dt * 4);
  const sy = Math.sin(s.yaw);
  const cy = Math.cos(s.yaw);
  const dx = -sy * fwd + cy * str;
  const dz = -cy * fwd - sy * str;
  const dl = Math.hypot(dx, dz) || 1;
  const step = m > 0.01 ? s.speedNow * dt : 0;
  const { player } = s;
  const nx = player.x + (dx / dl) * step;
  const nz = player.z + (dz / dl) * step;
  const [cx, cz] = s.phase === "walk" ? clampWalk(player, nx, nz) : s.phase === "climb" ? clampClimb(nx, nz) : clampTop(player, nx, nz);
  s.walked += Math.hypot(cx - player.x, cz - player.z);
  player.x = cx;
  player.z = cz;
};

export const followGround = (s, groundY, dt) => {
  const { player } = s;
  player.y += (groundY - player.y) * Math.min(1, dt * 9);
  if (s.phase === "top" && player.z < -696) player.y = groundY;
};

export const stepGait = (s, dt) => {
  s.stepPhase += s.speedNow * dt * 1.7;
  const sin = Math.sin(s.stepPhase);
  const stepped = s.speedNow > 0.4 && s.lastSin * sin < 0;
  s.lastSin = sin;
  return { stepped, bob: Math.abs(sin) * 0.04 * Math.min(1, s.speedNow / SPEED.WALK) };
};
