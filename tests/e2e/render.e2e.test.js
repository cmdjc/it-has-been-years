import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { decodePng } from "./png.js";
import { startServer } from "./server.js";

const SCREENSHOT = "tests/e2e/out/world-title.png";
const BLOCK = 40;

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

const meanColor = ({ width, channels, pixels }, x0, y0, size) => {
  const sum = [0, 0, 0];
  for (let y = y0; y < y0 + size; y++) {
    for (let x = x0; x < x0 + size; x++) {
      for (let c = 0; c < 3; c++) sum[c] += pixels[(y * width + x) * channels + c];
    }
  }
  return sum.map((total) => total / (size * size));
};

const standardDeviation = ({ width, height, channels, pixels }) => {
  const values = [];
  for (let i = 0; i < width * height; i++) {
    const o = i * channels;
    values.push((pixels[o] + pixels[o + 1] + pixels[o + 2]) / 3);
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
};

describe("title world render", () => {
  it("draws a sky and a non-blank scene behind the title", async () => {
    const page = await browser.openPage(`${server.url}/`);
    try {
      await new Promise((done) => setTimeout(done, 2000));
      await page.evaluate('for (const id of ["start", "white"]) document.getElementById(id).style.display = "none"');
      await page.screenshot(SCREENSHOT);
      const image = decodePng(readFileSync(SCREENSHOT));
      const [red, green, blue] = meanColor(image, Math.floor((image.width - BLOCK) / 2), 0, BLOCK);
      expect(blue).toBeGreaterThan(red);
      expect((red + green + blue) / 3).toBeGreaterThan(120);
      expect(standardDeviation(image)).toBeGreaterThan(10);
      expect(page.errors).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
