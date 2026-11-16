export const SPEEDS = [1, 4, 16, 64];
export const DEFAULT_SETTINGS = Object.freeze({ speed: 1, fly: false, skip: false, stats: false });
const STORAGE_KEY = "ihby.settings.v1";

const isBoolean = (value) => typeof value === "boolean";
const VALIDATORS = {
  speed: (value) => SPEEDS.includes(value),
  fly: isBoolean,
  skip: isBoolean,
  stats: isBoolean,
};

export function loadSettings(storage) {
  try {
    const stored = JSON.parse(storage.getItem(STORAGE_KEY));
    const valid = Object.entries(VALIDATORS).filter(([key, isValid]) => isValid(stored[key]));
    return { ...DEFAULT_SETTINGS, ...Object.fromEntries(valid.map(([key]) => [key, stored[key]])) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage, { speed, fly, skip, stats }) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ speed, fly, skip, stats }));
    return true;
  } catch {
    return false;
  }
}
