import { describe, expect, it } from "vitest";
import { createAudio } from "../../../src/audio/audio.js";
import { createSfx } from "../../../src/audio/sfx.js";
import { mulberry32 } from "../../../src/core/rng.js";
import { createFakeAudio } from "./fakeAudio.js";

function setup({ init = true, ...options } = {}) {
  const fake = createFakeAudio(options);
  const engine = createAudio({ AudioContext: fake.AudioContext, rng: mulberry32(3) });
  const sfx = createSfx(engine, mulberry32(4));
  if (init) engine.init();
  const baseline = fake.nodes.length;
  return { fake, engine, sfx, baseline };
}

const wetLevels = (fake, engine, from) => {
  const reverbInput = fake.nodes.find(n => n.kind === "convolver");
  return fake.nodes
    .slice(from)
    .filter(n => n.kind === "gain" && n.connections.includes(reverbInput))
    .map(n => n.gain.value);
};

describe("sfx", () => {
  it("every sound is a no-op before init", () => {
    const { fake, sfx } = setup({ init: false });
    sfx.step(true);
    sfx.chime();
    sfx.boing(1);
    sfx.burst(1, 500, 0.1, 0.5);
    sfx.beamChord();
    sfx.wind(0.5);
    expect(fake.nodes).toHaveLength(0);
  });

  it("every sound is a no-op after a failed init", () => {
    const { fake, sfx } = setup({ throws: true });
    sfx.step(false);
    sfx.chime();
    sfx.wind(0.5);
    expect(fake.nodes).toHaveLength(0);
  });

  it("step uses wet 1.1 and 0.9 inside the tunnel", () => {
    const { fake, engine, sfx, baseline } = setup();
    sfx.step(true);
    expect(wetLevels(fake, engine, baseline)).toEqual([1.1, 0.9]);
  });

  it("step uses wet 0.3 and 0.2 outside", () => {
    const { fake, engine, sfx, baseline } = setup();
    sfx.step(false);
    expect(wetLevels(fake, engine, baseline)).toEqual([0.3, 0.2]);
  });

  it("step randomizes filter frequency and buffer offset from rng", () => {
    const { fake, sfx, baseline } = setup();
    sfx.step(false);
    const filter = fake.nodes.slice(baseline).find(n => n.kind === "biquad");
    expect(filter.frequency.value).toBeGreaterThanOrEqual(2000);
    expect(filter.frequency.value).toBeLessThan(2600);
    const source = fake.nodes.slice(baseline).find(n => n.kind === "bufferSource");
    expect(source.startCalls[0][1]).toBeLessThan(2);
    expect(source.startCalls[0][2]).toBe(0.1);
  });

  it("chime plays three sines 0.35 s apart", () => {
    const { fake, engine, sfx, baseline } = setup();
    sfx.chime();
    const oscillators = fake.nodes.slice(baseline).filter(n => n.kind === "oscillator");
    expect(oscillators.map(o => o.frequency.value)).toEqual([880, 1318.5, 1760]);
    expect(oscillators.map(o => o.startCalls[0][0])).toEqual([0, 0.35, 0.35 * 2]);
    expect(oscillators.map(o => o.stopCalls[0][0])).toEqual([6.2, 0.35 + 6.2, 0.35 * 2 + 6.2]);
    expect(wetLevels(fake, engine, baseline)).toEqual([1, 1, 1]);
  });

  it("boing scales its peak by the argument", () => {
    const { fake, sfx, baseline } = setup();
    sfx.boing(2);
    const gain = fake.nodes.slice(baseline).find(n => n.kind === "gain");
    expect(gain.gain.calls[1]).toEqual({ op: "exp", value: 0.06 * 2 + 0.001, time: 0.02 });
  });

  it("burst takes its filter type, defaulting to lowpass", () => {
    const { fake, sfx, baseline } = setup();
    sfx.burst(2, 900, 0.3, 0.5);
    sfx.burst(2, 900, 0.3, 0.5, "highpass");
    const filters = fake.nodes.slice(baseline).filter(n => n.kind === "biquad");
    expect(filters.map(f => f.type)).toEqual(["lowpass", "highpass"]);
    expect(filters[0].frequency.value).toBe(900);
    expect(filters[0].Q.value).toBe(0.9);
  });

  it("beamChord plays four sines", () => {
    const { fake, sfx, baseline } = setup();
    sfx.beamChord();
    const oscillators = fake.nodes.slice(baseline).filter(n => n.kind === "oscillator");
    expect(oscillators.map(o => o.frequency.value)).toEqual([220, 330, 440, 660]);
  });

  it("wind creates its loop once and then only sets gain", () => {
    const { fake, sfx, baseline } = setup();
    sfx.wind(0.1);
    const afterFirst = fake.nodes.length;
    for (let i = 0; i < 20; i++) sfx.wind(i / 100);
    expect(fake.nodes).toHaveLength(afterFirst);
    const sources = fake.nodes.slice(baseline).filter(n => n.kind === "bufferSource");
    expect(sources).toHaveLength(1);
    expect(sources[0].loop).toBe(true);
    const windGain = fake.nodes[afterFirst - 1];
    expect(windGain.gain.value).toBe(0.19);
  });
});
