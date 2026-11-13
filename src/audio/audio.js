export function createAudio({ AudioContext, rng }) {
  let ctx = null;
  let master = null;
  let reverb = null;
  let noise = null;
  let seaGain = null;

  const noiseBuffer = (sec, brown) => {
    const n = Math.floor(ctx.sampleRate * sec);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = rng() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else data[i] = w;
    }
    return buffer;
  };

  const out = (node, wet) => {
    node.connect(master);
    if (wet) {
      const g = ctx.createGain();
      g.gain.value = wet;
      node.connect(g);
      g.connect(reverb);
    }
  };

  const loopNoise = (buffer, type, frequency, q, gain, lfoHz, lfoDepth) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    source.connect(filter);
    filter.connect(g);
    g.connect(master);
    source.start();
    if (lfoHz) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = lfoHz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      lfo.start();
    }
    return g;
  };

  const buildReverb = () => {
    const len = ctx.sampleRate * 3;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    }
    reverb = ctx.createConvolver();
    reverb.buffer = ir;
    const returnGain = ctx.createGain();
    returnGain.gain.value = 0.8;
    reverb.connect(returnGain);
    returnGain.connect(master);
  };

  const buildDrones = () => {
    [196, 293.7, 392].forEach((frequency, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const g = ctx.createGain();
      g.gain.value = 0.014;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.011;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(master);
      osc.start();
      lfo.start();
    });
  };

  const init = () => {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 4);
      buildReverb();
      noise = noiseBuffer(3, false);
      seaGain = loopNoise(noiseBuffer(8, true), "bandpass", 380, 0.5, 0.2, 0.11, 0.1);
      loopNoise(noiseBuffer(5, false), "bandpass", 3200, 0.8, 0.02, 0.13, 0.012);
      buildDrones();
      if (ctx.state === "suspended") ctx.resume();
    } catch {
      ctx = null;
    }
  };

  return {
    init,
    get ready() {
      return ctx !== null;
    },
    get ctx() {
      return ctx;
    },
    get now() {
      return ctx ? ctx.currentTime : 0;
    },
    get master() {
      return master;
    },
    get noise() {
      return noise;
    },
    get seaGain() {
      return seaGain;
    },
    noiseBuffer,
    out,
    duck(v, sec) {
      if (!ctx) return;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(v, ctx.currentTime + sec);
    },
    setSea(level) {
      if (ctx) seaGain.gain.value = level;
    },
    suspend() {
      if (ctx) ctx.suspend();
    },
    resume() {
      if (ctx) ctx.resume();
    },
  };
}
