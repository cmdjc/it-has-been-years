import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SKIPS } from "../../src/config.js";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

const POLL_MS = 500;
const TIME_LIMIT_MS = 9 * 60 * 1000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const DIVE_POLICY = "({ fwd: 1, str: 0, run: true })";
const BEAM_POLICY = `(s) => {
  if (s.phase === "top" && s.backSkipI < 3) return { fwd: -1, str: 0, run: true };
  return { fwd: 1, str: 0, run: true };
}`;

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

const play = async (policy) => {
  const page = await browser.openPage(`${server.url}/?debug&timescale=20`);
  try {
    await page.click("#go");
    await page.evaluate(`(() => {
      const policy = ${policy};
      const choose = typeof policy === "function" ? policy : () => policy;
      const tick = () => {
        window.__ihby.input(choose(window.__ihby.state()));
        requestAnimationFrame(tick);
      };
      tick();
    })()`);
    const phases = new Set();
    const deadline = Date.now() + TIME_LIMIT_MS;
    let state = await page.evaluate("window.__ihby.state()");
    while (!state.ended && Date.now() < deadline) {
      phases.add(state.phase);
      await sleep(POLL_MS);
      state = await page.evaluate("window.__ihby.state()");
    }
    expect(state.ended).toBe(true);
    const endText = await page.evaluate('document.getElementById("endtxt").innerHTML');
    expect(page.errors).toEqual([]);
    return { phases, endText };
  } finally {
    await page.close();
  }
};

describe("full playthrough at timescale 20", () => {
  it("reaches the dive ending", async () => {
    const { phases, endText } = await play(DIVE_POLICY);
    expect(endText).toBe(SKIPS.FINAL.dive.end);
    expect([...phases]).toEqual(expect.arrayContaining(["walk", "climb", "top"]));
  }, 10 * 60 * 1000);

  it("reaches the beam ending", async () => {
    const { phases, endText } = await play(BEAM_POLICY);
    expect(endText).toBe(SKIPS.FINAL.beam.end);
    expect([...phases]).toEqual(expect.arrayContaining(["walk", "climb", "top"]));
  }, 10 * 60 * 1000);
});
