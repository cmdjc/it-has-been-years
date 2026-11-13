import { TOP } from "../config.js";
import { clamp } from "../core/math.js";

export const boardShape = (s) => {
  const u = clamp(s / TOP.BOARD_L, 0, 1);
  return (u * u * (3 - u)) / 2;
};

export const onBoard = (x, z) => z < -696 && Math.abs(x) < 0.8;

export const boardTarget = ({ x, z, divePhase }) => {
  if (divePhase) return divePhase === "crouch" ? -0.55 : 0;
  return onBoard(x, z) ? -0.16 * boardShape(-698 - z) : 0;
};

export const stepBoard = (board, target, dt) => {
  board.v += (-89 * (board.x - target) - 1.9 * board.v) * dt;
  board.x += board.v * dt;
};
