import { mkdirSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

const OUT = "tests/e2e/out";
const MEASURE_MS = 5000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

let server;
let browser;

beforeAll(async () => {
  server = await startServer();
  browser = await connectBrowser();
});

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

const measureFrames = (durationMs) => `new Promise((done) => {
  const intervals = [];
  let last = performance.now();
  const start = last;
  const tick = (now) => {
    intervals.push(now - last);
    last = now;
    if (now - start < ${durationMs}) requestAnimationFrame(tick);
    else {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl && gl.getExtension("WEBGL_debug_renderer_info");
      done({
        intervals,
        elapsed: now - start,
        userAgent: navigator.userAgent,
        webglRenderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null,
      });
    }
  };
  requestAnimationFrame(tick);
})`;

describe("frame time", () => {
  it("reports fps and p95 frame time at stage W0", async () => {
    const page = await browser.openPage(`${server.url}/?stage=W0`);
    try {
      await sleep(2000);
      const { intervals, elapsed, userAgent, webglRenderer } = await page.evaluate(measureFrames(MEASURE_MS));
      const sorted = [...intervals].sort((a, b) => a - b);
      const result = {
        fps: (intervals.length / elapsed) * 1000,
        p95FrameMs: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
        userAgent,
        webglRenderer,
      };
      mkdirSync(OUT, { recursive: true });
      writeFileSync(`${OUT}/perf.json`, JSON.stringify(result, null, 2));
      console.log(JSON.stringify(result));
      expect(result.fps).toBeGreaterThan(1);
      expect(page.errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
