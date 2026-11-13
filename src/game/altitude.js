import { OCEAN_Y } from "../config.js";
import { clamp } from "../core/math.js";

export const altitude = ({ phase, skipAlt, playerY }) => {
  const alt = skipAlt + (phase === "walk" ? 0 : playerY);
  const space = clamp((alt - 30000) / 120000, 0, 1);
  const tNear = phase === "top" ? 500 : phase === "climb" ? Math.min(1e6, Math.max(5, alt * 0.25)) : 1e6;
  return {
    alt,
    space,
    seaY: OCEAN_Y - skipAlt,
    worldY: -skipAlt,
    worldVisible: alt < 40000,
    tNear,
    seaLevel: 0.2 * (1 - space),
  };
};

export const needsNear = (current, wanted) => Math.abs(current - wanted) > wanted * 0.02;
