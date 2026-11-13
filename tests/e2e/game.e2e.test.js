import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { decodePng, stddev } from "./png.js";
import { startServer } from "./server.js";

const OUT = "tests/e2e/out";
const BEAM_Z = 1.0029e6;
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

const withPage = async (query, run) => {
  const page = await browser.openPage(`${server.url}/${query}`);
  try {
    await run(page);
    expect(page.errors).toEqual([]);
  } finally {
    await page.close();
  }
};

const shotDeviation = async (page, name) => {
  const file = `${OUT}/${name}.png`;
  await page.screenshot(file);
  return stddev(decodePng(readFileSync(file)));
};

describe("begin", () => {
  it("starts the game from a real click and leaves no debug hooks", async () => {
    await withPage("", async (page) => {
      await page.click("#go");
      await sleep(2500);
      expect(await page.evaluate('getComputedStyle(document.getElementById("start")).display')).toBe("none");
      expect(await page.evaluate('document.getElementById("white").classList.contains("off")')).toBe(true);
      expect(await page.evaluate('typeof window.__ihby')).toBe("undefined");
      expect(await shotDeviation(page, "begin")).toBeGreaterThan(10);
    });
  });
});

describe("keyboard", () => {
  it("walks forward while W is held", async () => {
    await withPage("?debug", async (page) => {
      await page.click("#go");
      await sleep(3000);
      const startZ = await page.evaluate("window.__ihby.state().z");
      const key = { code: "KeyW", key: "w", windowsVirtualKeyCode: 87 };
      await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...key });
      await sleep(2000);
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...key });
      const endZ = await page.evaluate("window.__ihby.state().z");
      expect(startZ - endZ).toBeGreaterThan(4);
    });
  });
});

const STAGES = [
  ...[0, 1, 2, 3].map((k) => [`W${k}`, (s) => {
    expect(s.phase).toBe("walk");
    expect(s.skipN).toBe(k);
  }]),
  ...[0, 1, 2, 3, 4].map((k) => [`C${k}`, (s) => {
    expect(s.phase).toBe("climb");
    expect(s.climbSkips).toBe(k);
  }]),
  ["TOP", (s) => {
    expect(s.phase).toBe("top");
    expect(Math.abs(s.z - 40)).toBeLessThan(2);
  }],
  ["TIP", (s) => {
    expect(s.phase).toBe("top");
    expect(Math.abs(s.z + 1618)).toBeLessThan(2);
  }],
  ["BEAM", (s) => {
    expect(s.phase).toBe("top");
    expect(Math.abs(s.z - (BEAM_Z - 30))).toBeLessThan(2);
  }],
];

describe("stages", () => {
  it.each(STAGES)("renders stage %s", async (code, check) => {
    await withPage(`?debug&stage=${code}`, async (page) => {
      await sleep(3000);
      check(await page.evaluate("window.__ihby.state()"));
      expect(await shotDeviation(page, `stage-${code}`)).toBeGreaterThan(5);
    });
  });
});
