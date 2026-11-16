import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, SPEEDS, loadSettings, saveSettings } from "../../src/settings.js";

const fakeStorage = () => {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) };
};
const throwing = () => ({ getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } });
const storeWith = (raw) => {
  const storage = fakeStorage();
  storage.setItem("ihby.settings.v1", raw);
  return storage;
};

describe("settings constants", () => {
  it("lists the speeds and defaults", () => {
    expect(SPEEDS).toEqual([1, 4, 16, 64]);
    expect(DEFAULT_SETTINGS).toEqual({ speed: 1, fly: false, skip: false, stats: false });
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });
});

describe("loadSettings", () => {
  it("returns defaults for null, throwing, empty, and malformed storage", () => {
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(throwing())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(storeWith("{nope"))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(storeWith("null"))).toEqual(DEFAULT_SETTINGS);
  });
  it("returns a new object", () => {
    expect(loadSettings(null)).not.toBe(DEFAULT_SETTINGS);
  });
  it("drops invalid fields and keeps valid ones", () => {
    const loaded = loadSettings(storeWith(JSON.stringify({ speed: 5, fly: "yes", skip: true, stats: 1 })));
    expect(loaded).toEqual({ speed: 1, fly: false, skip: true, stats: false });
  });
});

describe("saveSettings", () => {
  it("round trips through storage and writes only the four fields", () => {
    const storage = fakeStorage();
    expect(saveSettings(storage, { speed: 16, fly: true, skip: false, stats: true, extra: 9 })).toBe(true);
    expect(JSON.parse(storage.getItem("ihby.settings.v1"))).toEqual({ speed: 16, fly: true, skip: false, stats: true });
    expect(loadSettings(storage)).toEqual({ speed: 16, fly: true, skip: false, stats: true });
  });
  it("returns false for missing or throwing storage", () => {
    expect(saveSettings(throwing(), DEFAULT_SETTINGS)).toBe(false);
    expect(saveSettings(null, DEFAULT_SETTINGS)).toBe(false);
  });
});
