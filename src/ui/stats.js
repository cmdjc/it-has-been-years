const round = (value, step) => (Math.round(value / step) * step).toFixed(step < 1 ? 1 : 0);

export function createStats(el) {
  return function update({ phase, skipAlt, player }, fps) {
    el.textContent = [
      phase,
      [player.x, player.y, player.z].map((value) => round(value, 0.1)).join(" "),
      `alt ${round(skipAlt + player.y, 1)} m`,
      `fps ${round(fps, 1)}`,
    ].join("\n");
  };
}
