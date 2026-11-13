import { PATH, TOP } from "../config.js";
import { boardShape, onBoard } from "./board.js";

const beamPadHeight = (x, z) => {
  const dz = z - TOP.BEAM_Z;
  if (Math.abs(x) < 4.4 && dz > -6 && dz < 3.4) return dz < -5.2 ? 0.24 : dz < -4.4 ? 0.46 : 0.68;
  if (Math.abs(x) < 40 && Math.abs(dz) < 40) return 0.02;
  return 0;
};

const topHeight = (x, z, boardX) => {
  if (onBoard(x, z)) return 0.6 + boardX * boardShape(-698 - z);
  if (z < -420 && z > -620 && Math.abs(x) < 2.5) return 0.9;
  return 0;
};

const STAIRS = { n: 24, run: 0.7, rise: 0.22 };

const stairsHeight = (d) => {
  const { n, run, rise } = STAIRS;
  const top = n * rise;
  if (d < n * run) return (Math.floor(d / run) + 1) * rise;
  if (d < n * run + 12) return top;
  return Math.max(0, top - (Math.floor((d - n * run - 12) / run) + 1) * rise);
};

export const groundHeight = ({ phase, x, z, seg, boardX }) => {
  if (phase === "top") return z > 1e5 ? beamPadHeight(x, z) : topHeight(x, z, boardX);
  if (!seg) return 0;
  const d = seg.z0 - z;
  switch (seg.type) {
    case "ramp": return seg.y0 + PATH.SLOPE * d;
    case "landing": return seg.y0;
    case "arch": return seg.H * Math.sin((Math.PI * d) / seg.L);
    case "stairs": return stairsHeight(d);
    default: return 0;
  }
};
