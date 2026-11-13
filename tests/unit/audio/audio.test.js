import { describe, expect, it } from "vitest";
import { createAudio } from "../../../src/audio/audio.js";
import { mulberry32 } from "../../../src/core/rng.js";
import { createFakeAudio } from "./fakeAudio.js";

function setup(options) {
  const fake = createFakeAudio(options);
  const engine = createAudio({ AudioContext: fake.AudioContext, rng: mulberry32(1) });
  return { fake, engine };
}

describe("audio engine", () => {
  it("is silent and creates nothing before init", () => {
    const { fake, engine } = setup();
    expect(engine.ready).toBe(false);
    expect(engine.now).toBe(0);
    engine.duck(0.1, 1);
    engine.setSea(0.1);
    engine.suspend();
    engine.resume();
    expect(fake.nodes).toHaveLength(0);
  });

  it("ramps master to 0.9 over 4 seconds on init", () => {
    const { engine } = setup();
    engine.init();
    expect(engine.ready).toBe(true);
    expect(engine.master.gain.value).toBe(0);
    expect(engine.master.gain.calls).toEqual([{ op: "linear", value: 0.9, time: 4 }]);
    expect(engine.master.connections).toContain(engine.ctx.destination);
  });

  it("resumes a suspended context on init", () => {
    const { engine } = setup();
    engine.init();
    expect(engine.ctx.resumeCalls).toBe(1);
  });

  it("builds the reverb, sea, hiss and three drones", () => {
    const { fake, engine } = setup();
    engine.init();
    const convolver = fake.nodes.find(n => n.kind === "convolver");
    expect(convolver.buffer.numberOfChannels).toBe(2);
    expect(convolver.buffer.length).toBe(300);
    const bands = fake.nodes.filter(n => n.kind === "biquad");
    expect(bands.map(b => [b.type, b.frequency.value, b.Q.value])).toEqual([
      ["bandpass", 380, 0.5],
      ["bandpass", 3200, 0.8],
    ]);
    const drones = fake.nodes.filter(n => n.kind === "oscillator" && n.frequency.value > 100);
    expect(drones.map(d => d.frequency.value)).toEqual([196, 293.7, 392]);
    const lfos = fake.nodes.filter(n => n.kind === "oscillator" && n.frequency.value < 1);
    expect(lfos.map(l => l.frequency.value)).toEqual([0.11, 0.13, 0.05, 0.05 + 0.03, 0.05 + 2 * 0.03]);
    const gains = fake.nodes.filter(n => n.kind === "gain").map(g => g.gain.value);
    expect(gains).toContain(0.8);
    expect(gains).toContain(0.2);
    expect(gains).toContain(0.02);
    expect(gains.filter(v => v === 0.014)).toHaveLength(3);
  });

  it("setSea sets the sea gain value", () => {
    const { engine } = setup();
    engine.init();
    engine.setSea(0.07);
    expect(engine.seaGain.gain.value).toBe(0.07);
  });

  it("stays silent when the context constructor throws", () => {
    const { fake, engine } = setup({ throws: true });
    engine.init();
    expect(engine.ready).toBe(false);
    engine.duck(0.1, 1);
    expect(fake.nodes).toHaveLength(0);
  });

  it("duck cancels, holds the value and ramps", () => {
    const { engine } = setup();
    engine.init();
    engine.ctx.currentTime = 2;
    const before = engine.master.gain.calls.length;
    engine.duck(0.12, 1.6);
    expect(engine.master.gain.calls.slice(before)).toEqual([
      { op: "cancel", time: 2 },
      { op: "set", value: 0, time: 2 },
      { op: "linear", value: 0.12, time: 3.6 },
    ]);
  });

  it("suspend and resume reach the context", () => {
    const { engine } = setup();
    engine.init();
    engine.suspend();
    engine.resume();
    expect(engine.ctx.suspendCalls).toBe(1);
    expect(engine.ctx.resumeCalls).toBe(2);
  });

  it("same seed gives identical noise buffers", () => {
    const make = () => {
      const fake = createFakeAudio();
      const engine = createAudio({ AudioContext: fake.AudioContext, rng: mulberry32(7) });
      engine.init();
      return engine.noiseBuffer(1, true).getChannelData(0);
    };
    expect(Array.from(make())).toEqual(Array.from(make()));
  });
});
