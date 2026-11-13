import { describe, expect, it } from "vitest";
import { parseDebug } from "../../src/debug.js";

const CODES = ["W0", "W1", "W2", "W3", "C0", "C1", "C2", "C3", "C4", "TOP", "TIP", "BEAM"];

describe("parseDebug", () => {
  it("returns defaults for an empty query", () => {
    expect(parseDebug("")).toEqual({ debug: false, stage: null, timescale: 1 });
  });

  it("sets debug when the key is present, with or without a value", () => {
    expect(parseDebug("?debug").debug).toBe(true);
    expect(parseDebug("?debug=1").debug).toBe(true);
    expect(parseDebug("?stage=W1").debug).toBe(false);
  });

  it.each(CODES)("accepts stage %s", (code) => {
    expect(parseDebug(`?stage=${code}`).stage).toBe(code);
  });

  it("rejects an unknown stage and lists the valid codes", () => {
    expect(() => parseDebug("?stage=W9")).toThrow(Error);
    expect(() => parseDebug("?stage=w1")).toThrow(CODES.join(" "));
    expect(() => parseDebug("?stage=")).toThrow(/Unknown stage/);
  });

  it("parses a positive finite timescale", () => {
    expect(parseDebug("?timescale=8").timescale).toBe(8);
    expect(parseDebug("?timescale=0.5").timescale).toBe(0.5);
  });

  it.each(["0", "-1", "abc", "Infinity", "NaN", ""])("rejects timescale %j", (value) => {
    expect(() => parseDebug(`?timescale=${value}`)).toThrow(Error);
  });
});
