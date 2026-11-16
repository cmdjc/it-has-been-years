// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createStats } from "../../../src/ui/stats.js";

describe("stats", () => {
  it("writes the phase, the position, the altitude, and the fps", () => {
    const el = document.createElement("div");
    const update = createStats(el);
    update({ phase: "climb", skipAlt: 3000, player: { x: 1.26, y: 10.4, z: -5.04 } }, 59.6);
    expect(el.textContent.split("\n")).toEqual(["climb", "1.3 10.4 -5.0", "alt 3010 m", "fps 60"]);
  });
});
