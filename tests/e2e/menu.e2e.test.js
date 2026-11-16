import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

const OUT = "tests/e2e/out";
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const KEYS = {
  KeyW: { code: "KeyW", key: "w", windowsVirtualKeyCode: 87 },
  KeyN: { code: "KeyN", key: "n", windowsVirtualKeyCode: 78 },
  Space: { code: "Space", key: " ", windowsVirtualKeyCode: 32 },
};

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

const withPage = async (run, opts) => {
  const page = await browser.openPage(`${server.url}/?debug`, opts);
  try {
    await run(page);
    expect(page.errors).toEqual([]);
  } finally {
    await page.evaluate("localStorage.clear()");
    await page.close();
  }
};

const state = (page) => page.evaluate("window.__ihby.state()");
const visible = (page, selector) => page.evaluate(`(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && !el.closest("[hidden]");
})()`);
const pressed = (page, selector) => page.evaluate(`document.querySelector(${JSON.stringify(selector)}).getAttribute("aria-pressed")`);

const hold = async (page, name, ms) => {
  await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...KEYS[name] });
  await sleep(ms);
  await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...KEYS[name] });
};

const reload = async (page) => {
  const loaded = new Promise((done) => page.on("Page.loadEventFired", done));
  await page.send("Page.reload");
  await loaded;
};

describe("start menu", () => {
  it("jumps to a chapter", async () => {
    await withPage(async (page) => {
      await page.click("#m-chapters");
      await page.click('#chapters [data-stage="TIP"]');
      await sleep(2000);
      const { phase, z } = await state(page);
      expect(phase).toBe("top");
      expect(Math.abs(z + 1618)).toBeLessThan(2);
    });
  });

  it("shows the credits and goes back", async () => {
    await withPage(async (page) => {
      await page.click("#m-credits");
      expect(await visible(page, "#p-credits")).toBe(true);
      const text = await page.evaluate('document.getElementById("p-credits").textContent');
      expect(text).toContain("M K");
      expect(text).toContain("Claude");
      await page.click("#p-credits .back");
      expect(await visible(page, "#menu")).toBe(true);
      expect(await visible(page, "#p-credits")).toBe(false);
    });
  });

  it("keeps the settings across a reload and applies them in the game", async () => {
    await withPage(async (page) => {
      await page.click("#m-debug");
      await page.click('[data-speed="16"]');
      await page.click("#d-fly");
      await page.click("#d-skip");
      await page.click("#d-stats");
      await reload(page);
      await page.click("#m-debug");
      expect(await pressed(page, '[data-speed="16"]')).toBe("true");
      expect(await pressed(page, "#d-fly")).toBe("true");
      expect(await pressed(page, "#d-skip")).toBe("true");
      expect(await pressed(page, "#d-stats")).toBe("true");
      await page.click("#p-debug .back");
      await page.click("#go");
      await sleep(2500);
      expect(await visible(page, "#stats")).toBe(true);
      expect(await page.evaluate('document.getElementById("stats").textContent')).toContain("fps");
      expect(await visible(page, "#dbar")).toBe(true);

      const startZ = (await state(page)).z;
      await hold(page, "KeyW", 2000);
      expect(startZ - (await state(page)).z).toBeGreaterThan(25);

      const startY = (await state(page)).y;
      await hold(page, "Space", 1000);
      expect((await state(page)).y - startY).toBeGreaterThan(20);

      await page.send("Input.dispatchKeyEvent", { type: "keyDown", ...KEYS.KeyN });
      await page.send("Input.dispatchKeyEvent", { type: "keyUp", ...KEYS.KeyN });
      await page.waitFor("window.__ihby.state().skipping", 1000);
      expect((await state(page)).skipN).toBe(1);
    });
  });

  it("takes screenshots of each screen", async () => {
    await withPage(async (page) => {
      await page.screenshot(`${OUT}/menu-main.png`);
      await page.click("#m-chapters");
      await page.screenshot(`${OUT}/menu-chapters.png`);
      await page.click("#p-chapters .back");
      await page.click("#m-credits");
      await page.screenshot(`${OUT}/menu-credits.png`);
      await page.click("#p-credits .back");
      await page.click("#m-debug");
      await page.screenshot(`${OUT}/menu-debug.png`);
    });
    await withPage(async (page) => {
      await page.click("#m-debug");
      await page.screenshot(`${OUT}/menu-phone.png`);
    }, { width: 390, height: 844 });
  });
});
