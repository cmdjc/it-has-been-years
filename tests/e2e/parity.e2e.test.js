import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectBrowser } from "./cdp.js";
import { decodePng, meanGrid } from "./png.js";
import { startServer } from "./server.js";

const OUT = "tests/e2e/out";
const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const THREE_FILE = "node_modules/three/build/three.min.js";
const CODES = ["W0", "W1", "W2", "W3", "C0", "C1", "C2", "C3", "C4", "TOP", "TIP", "BEAM"];
const GRID = 8;
const MEAN_LIMIT = 10;
const CELL_LIMIT = 40;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

let server;
let browser;
const report = {};

beforeAll(async () => {
  server = await startServer();
  browser = await connectBrowser();
});

afterAll(async () => {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/parity.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  await server?.close();
});

const shoot = async (page, code, build) => {
  const file = `${OUT}/parity-${code}-${build}.png`;
  await page.screenshot(file);
  return file;
};

const captureLegacy = async (code) => {
  const page = await browser.openPage(`${server.url}/legacy/it-has-been-years-stages.html`, {
    before: (p) => p.serveFile(THREE_CDN, THREE_FILE, "text/javascript"),
  });
  try {
    await page.click(`#dbg button[data-c="${code}"]`);
    await page.evaluate('document.getElementById("dbg").style.display = "none"');
    await sleep(3000);
    return { file: await shoot(page, code, "legacy"), errors: page.errors };
  } finally {
    await page.close();
  }
};

const captureNew = async (code) => {
  const page = await browser.openPage(`${server.url}/?stage=${code}`);
  try {
    await sleep(3000);
    const file = await shoot(page, code, "new");
    expect(page.errors).toEqual([]);
    return file;
  } finally {
    await page.close();
  }
};

const compare = (legacyFile, newFile) => {
  const legacy = meanGrid(decodePng(readFileSync(legacyFile)), GRID);
  const current = meanGrid(decodePng(readFileSync(newFile)), GRID);
  const cellDiffs = legacy.map((cell, i) => cell.reduce((sum, value, c) => sum + Math.abs(value - current[i][c]), 0) / 3);
  return {
    meanDiff: cellDiffs.reduce((sum, value) => sum + value, 0) / cellDiffs.length,
    maxCellDiff: Math.max(...cellDiffs),
  };
};

describe("parity with legacy v26", () => {
  it.each(CODES)("stage %s matches the legacy color grid", async (code) => {
    const legacy = await captureLegacy(code);
    const newFile = await captureNew(code);
    const numbers = compare(legacy.file, newFile);
    report[code] = { ...numbers, legacyErrors: legacy.errors };
    expect(numbers.meanDiff).toBeLessThanOrEqual(MEAN_LIMIT);
    expect(numbers.maxCellDiff).toBeLessThanOrEqual(CELL_LIMIT);
  });
});
