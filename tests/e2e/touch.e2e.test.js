import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

const TOUCH_LOOK = 0.0052;
const HOLD_MS = 3000;
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

describe("touch input", () => {
  it("walks with the left thumb and looks with the right thumb", async () => {
    const page = await browser.openPage(`${server.url}/?debug`);
    try {
      await page.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      await page.click("#go");
      await sleep(3000);
      const startZ = await page.evaluate("window.__ihby.state().z");

      await page.touch("touchStart", [{ x: 200, y: 500 }]);
      const holdEnd = Date.now() + HOLD_MS;
      while (Date.now() < holdEnd) {
        await page.touch("touchMove", [{ x: 200, y: 420 }]);
        await sleep(50);
      }
      expect(await page.evaluate('getComputedStyle(document.getElementById("joy")).display')).toBe("block");
      await page.touch("touchEnd", []);
      await sleep(200);
      const endZ = await page.evaluate("window.__ihby.state().z");
      expect(startZ - endZ).toBeGreaterThan(3);
      expect(await page.evaluate('getComputedStyle(document.getElementById("joy")).display')).toBe("none");

      const startYaw = await page.evaluate("window.__ihby.state().yaw");
      await page.touch("touchStart", [{ x: 1000, y: 400 }]);
      await page.touch("touchMove", [{ x: 900, y: 400 }]);
      await sleep(200);
      await page.touch("touchEnd", []);
      await sleep(200);
      const yawChange = (await page.evaluate("window.__ihby.state().yaw")) - startYaw;
      expect(Math.abs(yawChange - 100 * TOUCH_LOOK)).toBeLessThan(0.05);
      expect(page.errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
