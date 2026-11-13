import { describe, it, expect } from "vitest";
import { mulberry32 } from "../../../src/core/rng.js";
import { stubCanvas } from "../helpers/stubCanvas.js";
import { createMaterials } from "../../../src/gfx/materials.js";
import { createView, createQuality, adapt } from "../../../src/gfx/renderer.js";

function spyGl() {
  const calls = [];
  let pixelRatio = 1;
  const gl = {
    calls,
    autoClear: true,
    domElement: {},
    capabilities: { isWebGL2: true, getMaxAnisotropy: () => 8 },
    getPixelRatio: () => pixelRatio,
    setPixelRatio: (value) => { pixelRatio = value; calls.push({ call: "setPixelRatio", value }); },
    setSize: (w, h) => calls.push({ call: "setSize", w, h }),
    setRenderTarget: (target) => calls.push({ call: "setRenderTarget", target }),
    clear: () => calls.push({ call: "clear" }),
    clearDepth: () => calls.push({ call: "clearDepth" }),
    render: (scene) => calls.push({ call: "render", scene, near: null, far: null }),
  };
  return gl;
}

const win = { innerWidth: 800, innerHeight: 400, devicePixelRatio: 2 };

function build() {
  const gl = spyGl();
  const mats = createMaterials({ createCanvas: (w, h) => stubCanvas(w, h), anisotropy: 8, paint: mulberry32(1) });
  const view = createView({ gl, mats, win });
  const render = gl.render;
  gl.render = (scene, camera) => {
    render(scene);
    const entry = gl.calls[gl.calls.length - 1];
    entry.near = camera.near;
    entry.far = camera.far;
    entry.name = scene === view.scene ? "scene" : scene === view.tScene ? "tScene" : "post";
  };
  gl.calls.length = 0;
  return { gl, view };
}

const summarize = (calls) => calls.map((entry) => (entry.call === "render" ? `render:${entry.name}` : entry.call));

describe("createView setup", () => {
  it("caps the pixel ratio, sizes the canvas, and disables autoClear", () => {
    const gl = spyGl();
    const mats = createMaterials({ createCanvas: (w, h) => stubCanvas(w, h), anisotropy: 8, paint: mulberry32(1) });
    createView({ gl, mats, win });
    expect(gl.calls).toContainEqual({ call: "setPixelRatio", value: 1.6 });
    expect(gl.calls).toContainEqual({ call: "setSize", w: 800, h: 400 });
    expect(gl.autoClear).toBe(false);
  });

  it("builds the near and far scenes with the legacy cameras and fog", () => {
    const { view } = build();
    expect(view.camera.rotation.order).toBe("YXZ");
    expect([view.camera.near, view.camera.far]).toEqual([0.15, 60000]);
    expect([view.tCam.near, view.tCam.far]).toEqual([1e6, 3e8]);
    expect(view.tScene.fog.density).toBe(5e-8);
    expect(view.sky.renderOrder).toBe(-10);
    expect(view.scene.children).toContain(view.seaNear);
    expect(view.tScene.children).toContain(view.seaFar);
    expect(view.tScene.children).toContain(view.sky);
  });
});

describe("render order", () => {
  const postPasses = ["setRenderTarget", "render:post"];
  const tail = Array.from({ length: 6 }, () => postPasses).flat();

  it("renders far, near, then six post passes (bright, four blurs, final) in walk phase", () => {
    const { gl, view } = build();
    view.render("walk", 0);
    expect(summarize(gl.calls)).toEqual([
      "setRenderTarget", "clear", "render:tScene", "clearDepth", "render:scene", ...tail,
    ]);
    expect(gl.calls[0].target).toBe(view.post.target);
    expect(gl.calls.at(-2).target).toBeNull();
  });

  it("splits the far scene into two depth ranges in top phase and restores tCam", () => {
    const { gl, view } = build();
    view.render("top", 0);
    expect(summarize(gl.calls)).toEqual([
      "setRenderTarget", "clear", "render:tScene", "clearDepth", "render:tScene", "clearDepth", "render:scene", ...tail,
    ]);
    const far = gl.calls.filter((entry) => entry.name === "tScene");
    expect([far[0].near, far[0].far]).toEqual([1e5, 3e8]);
    expect([far[1].near, far[1].far]).toEqual([2, 2.5e5]);
    expect([view.tCam.near, view.tCam.far]).toEqual([1e6, 3e8]);
  });

  it("follows the camera with the far camera, sky, and seas", () => {
    const { view } = build();
    view.camera.position.set(5, 7, -9);
    view.render("walk", 0);
    expect(view.tCam.position.toArray()).toEqual([5, 7, -9]);
    expect(view.sky.position.toArray()).toEqual([5, 7, -9]);
    expect([view.seaNear.position.x, view.seaNear.position.z]).toEqual([5, -9]);
    expect([view.seaFar.position.x, view.seaFar.position.z]).toEqual([5, -9]);
  });
});

describe("resize and pixel ratio", () => {
  it("updates aspect and sizes the renderer and post targets", () => {
    const { gl, view } = build();
    win.innerWidth = 1000;
    win.innerHeight = 500;
    view.resize();
    win.innerWidth = 800;
    win.innerHeight = 400;
    expect(view.camera.aspect).toBe(2);
    expect(view.tCam.aspect).toBe(2);
    expect(gl.calls).toContainEqual({ call: "setSize", w: 1000, h: 500 });
    expect(view.post.target.width).toBe(1600);
  });

  it("applies a new pixel ratio", () => {
    const { gl, view } = build();
    view.setPixelRatio(1.2);
    expect(gl.calls).toContainEqual({ call: "setPixelRatio", value: 1.2 });
    expect(view.post.target.width).toBe(960);
  });
});

describe("adapt", () => {
  const feed = (q, fps, seconds) => {
    const drops = [];
    for (let i = 0; i < fps * seconds; i++) {
      const dropped = adapt(q, 1 / fps);
      if (dropped !== null) drops.push(dropped);
    }
    return drops;
  };

  it("starts from the capped device pixel ratio", () => {
    expect(createQuality(3)).toEqual({ pr: 1.6, acc: 0, n: 0, tries: 0 });
    expect(createQuality(0).pr).toBe(1);
  });

  it("lowers the ratio by 0.75 at 30 fps over 2.5 s", () => {
    const q = createQuality(1.6);
    const drops = feed(q, 30, 2.6);
    expect(drops).toHaveLength(1);
    expect(drops[0]).toBeCloseTo(1.2, 10);
    expect(q.tries).toBe(1);
  });

  it("never goes below 0.8 and stops after 3 drops", () => {
    const q = createQuality(1.6);
    const drops = feed(q, 30, 30);
    expect(drops).toHaveLength(3);
    expect(Math.min(...drops)).toBeGreaterThanOrEqual(0.8);
    expect(q.tries).toBe(3);
    expect(feed(q, 30, 10)).toEqual([]);
  });

  it("clamps at the floor", () => {
    const q = createQuality(1);
    const drops = feed(q, 30, 10);
    expect(drops).toEqual([0.8]);
  });

  it("stops adapting at 60 fps", () => {
    const q = createQuality(1.6);
    expect(feed(q, 60, 2.6)).toEqual([]);
    expect(q.tries).toBe(3);
    expect(feed(q, 30, 10)).toEqual([]);
    expect(q.pr).toBe(1.6);
  });
});
