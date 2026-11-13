export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

export const smooth = (t) => t * t * (3 - 2 * t);

export const ramp = (x, a, b) => clamp((x - a) / (b - a), 0, 1);

export const wrapPi = (a) => ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
