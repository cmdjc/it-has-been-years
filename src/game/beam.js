import { PATH } from "../config.js";

export const startBeam = (pitch) => ({ t: 0, pitch, fin: false });

export const stepBeam = (B, dt, { x, y, z, yaw }) => {
  const events = [];
  B.t += dt;
  B.pitch += (1.45 - B.pitch) * Math.min(1, dt * 0.8);
  if (B.t > 10 && !B.fin) {
    B.fin = true;
    events.push({ type: "final" });
  }
  const pose = { kind: "euler", x: x + PATH.CX, y: y + 1.62 + 4e5 * (Math.exp(0.5 * B.t) - 1), z, pitch: B.pitch, yaw, roll: 0 };
  return { pose, events };
};
