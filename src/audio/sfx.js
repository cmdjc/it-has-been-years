export function createSfx(engine, rng) {
  let windGain = null;

  const step = inTunnel => {
    if (!engine.ready) return;
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = engine.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2000 + rng() * 600;
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.13, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    source.connect(filter);
    filter.connect(g);
    engine.out(g, inTunnel ? 1.1 : 0.3);
    source.start(t, rng() * 2, 0.1);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.06);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.1, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g2);
    engine.out(g2, inTunnel ? 0.9 : 0.2);
    osc.start(t);
    osc.stop(t + 0.1);
  };

  const chime = () => {
    if (!engine.ready) return;
    const ctx = engine.ctx;
    [880, 1318.5, 1760].forEach((frequency, i) => {
      const t = ctx.currentTime + i * 0.35;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
      osc.connect(g);
      engine.out(g, 1.0);
      osc.start(t);
      osc.stop(t + 6.2);
    });
  };

  const boing = a => {
    if (!engine.ready) return;
    const ctx = engine.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06 * a + 0.001, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    osc.connect(g);
    engine.out(g, 0.4);
    osc.start(t);
    osc.stop(t + 0.55);
  };

  const burst = (dur, freq, gain, wet, type) => {
    if (!engine.ready) return;
    const ctx = engine.ctx;
    const source = ctx.createBufferSource();
    source.buffer = engine.noiseBuffer(Math.max(0.6, dur + 0.1), false);
    const filter = ctx.createBiquadFilter();
    filter.type = type || "lowpass";
    filter.frequency.value = freq;
    filter.Q.value = 0.9;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(filter);
    filter.connect(g);
    engine.out(g, wet);
    source.start(t);
  };

  const beamChord = () => {
    if (!engine.ready) return;
    const ctx = engine.ctx;
    [220, 330, 440, 660].forEach((frequency, i) => {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03 / (1 + i * 0.4), t + 4);
      g.gain.linearRampToValueAtTime(0.0001, t + 14);
      osc.connect(g);
      engine.out(g, 0.9);
      osc.start(t);
      osc.stop(t + 14.5);
    });
  };

  const wind = gain => {
    if (!engine.ready) return;
    if (!windGain) {
      const ctx = engine.ctx;
      const source = ctx.createBufferSource();
      source.buffer = engine.noiseBuffer(4, false);
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 650;
      filter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      source.connect(filter);
      filter.connect(windGain);
      windGain.connect(engine.master);
      source.start();
    }
    windGain.gain.value = gain;
  };

  return { step, chime, boing, burst, beamChord, wind };
}
