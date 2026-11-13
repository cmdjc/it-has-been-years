import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { mulberry32 } from "../../../src/core/rng.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import {
  canvasTex,
  TEXTURE_SIZES,
  tilePainter,
  causticPainter,
  shadePainter,
  stairPainter,
  towerPainter,
  fallPainter,
  doorPainter,
  wallPainter,
  signPainter,
} from "../../../src/gfx/textures.js";

const record = (size, draw) => {
  const canvas = stubCanvas(size.w, size.h);
  draw(canvas.getContext("2d"), size.w, size.h);
  return canvas.calls;
};

describe("canvasTex", () => {
  it("builds a repeating texture from an injected canvas", () => {
    const made = [];
    const env = { createCanvas: (w, h) => { const c = stubCanvas(0, 0); made.push([w, h, c]); return c; }, anisotropy: 4 };
    const drawn = [];
    const tex = canvasTex(env, 64, 32, (g, w, h) => drawn.push([w, h]), 3, 5);
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(made[0].slice(0, 2)).toEqual([64, 32]);
    expect(made[0][2].width).toBe(64);
    expect(made[0][2].height).toBe(32);
    expect(tex.image).toBe(made[0][2]);
    expect(drawn).toEqual([[64, 32]]);
    expect(tex.wrapS).toBe(THREE.RepeatWrapping);
    expect(tex.wrapT).toBe(THREE.RepeatWrapping);
    expect(tex.repeat.toArray()).toEqual([3, 5]);
    expect(tex.anisotropy).toBe(4);
  });

  it("defaults the repeat to 1", () => {
    const env = { createCanvas: (w, h) => stubCanvas(w, h), anisotropy: 1 };
    expect(canvasTex(env, 8, 8, () => {}).repeat.toArray()).toEqual([1, 1]);
  });
});

describe("painters", () => {
  const seeded = {
    tile: (seed) => record(TEXTURE_SIZES.tile, tilePainter([240, 247, 247], "#a9d3d8", 0.05, mulberry32(seed))),
    caustic: (seed) => record(TEXTURE_SIZES.caustic, causticPainter(mulberry32(seed))),
    fall: (seed) => record(TEXTURE_SIZES.fall, fallPainter(mulberry32(seed))),
  };
  const plain = {
    shade: () => record(TEXTURE_SIZES.shade, shadePainter()),
    stair: () => record(TEXTURE_SIZES.stair, stairPainter()),
    tower: () => record(TEXTURE_SIZES.tower, towerPainter()),
    door: () => record(TEXTURE_SIZES.door, doorPainter()),
    wall: () => record(TEXTURE_SIZES.wall, wallPainter()),
    sign: () => record(TEXTURE_SIZES.sign, signPainter("A", "#123456")),
  };

  it("keeps the legacy canvas sizes", () => {
    expect(TEXTURE_SIZES).toEqual({
      tile: { w: 256, h: 256 },
      caustic: { w: 256, h: 256 },
      shade: { w: 64, h: 64 },
      stair: { w: 8, h: 64 },
      tower: { w: 512, h: 512 },
      fall: { w: 64, h: 256 },
      door: { w: 256, h: 256 },
      wall: { w: 512, h: 512 },
      sign: { w: 512, h: 128 },
    });
  });

  Object.entries(seeded).forEach(([name, run]) => {
    it(`${name} painter is deterministic per seed and varies across seeds`, () => {
      expect(run(1)).toEqual(run(1));
      expect(run(1)).not.toEqual(run(2));
    });
  });

  Object.entries(plain).forEach(([name, run]) => {
    it(`${name} painter draws the same thing every time`, () => {
      const calls = run();
      expect(calls.length).toBeGreaterThan(0);
      expect(run()).toEqual(calls);
    });
  });

  it("tile painter fills four shaded tiles and strokes the grout", () => {
    const calls = seeded.tile(7);
    const fills = calls.filter((c) => c.set === "fillStyle" && c.value.startsWith("rgb("));
    expect(fills).toHaveLength(4);
    expect(calls).toContainEqual({ set: "strokeStyle", value: "#a9d3d8" });
    expect(calls).toContainEqual({ method: "strokeRect", args: [0, 0, 256, 256] });
  });

  it("caustic painter draws 26 curves", () => {
    expect(seeded.caustic(3).filter((c) => c.method === "bezierCurveTo")).toHaveLength(26);
  });

  it("fall painter builds its gradient and nine streaks", () => {
    const calls = seeded.fall(3);
    expect(calls).toContainEqual({ method: "createLinearGradient", args: [0, 0, 0, 256] });
    expect(calls).toContainEqual({ method: "addColorStop", args: [1, "rgba(150,236,244,.75)"] });
    expect(calls.filter((c) => c.method === "fillRect")).toHaveLength(10);
  });

  it("sign painter draws the given text and color", () => {
    const calls = record(TEXTURE_SIZES.sign, signPainter("Exit here", "#abcdef"));
    expect(calls).toContainEqual({ method: "fillText", args: ["Exit here", 256, 67] });
    expect(calls).toContainEqual({ set: "fillStyle", value: "#abcdef" });
    expect(calls).toContainEqual({ set: "font", value: "bold 50px Helvetica, Arial" });
  });
});
