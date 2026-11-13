import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { startServer } from "./server.js";

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

describe("title screen", () => {
  it("shows the title, the heading, and the begin button without errors", async () => {
    const page = await browser.openPage(`${server.url}/`);
    try {
      expect(await page.evaluate("document.title")).toBe("It Has Been Years");
      expect(await page.evaluate('document.querySelector("#start h1").textContent')).toBe("It has been years.");
      const go = await page.evaluate(`(() => {
        const el = document.getElementById("go");
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return { text: el.textContent, visible: box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none" };
      })()`);
      expect(go).toEqual({ text: "BEGIN", visible: true });
      await page.screenshot("tests/e2e/out/title.png");
      expect(page.errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
