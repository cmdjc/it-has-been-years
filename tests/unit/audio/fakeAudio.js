class FakeParam {
  constructor(value = 0) {
    this.value = value;
    this.calls = [];
  }
  setValueAtTime(value, time) {
    this.calls.push({ op: "set", value, time });
  }
  linearRampToValueAtTime(value, time) {
    this.calls.push({ op: "linear", value, time });
  }
  exponentialRampToValueAtTime(value, time) {
    this.calls.push({ op: "exp", value, time });
  }
  cancelScheduledValues(time) {
    this.calls.push({ op: "cancel", time });
  }
}

class FakeNode {
  constructor(type, params = {}) {
    this.kind = type;
    this.connections = [];
    this.startCalls = [];
    this.stopCalls = [];
    for (const [name, initial] of Object.entries(params)) this[name] = new FakeParam(initial);
  }
  connect(target) {
    this.connections.push(target);
  }
  start(...args) {
    this.startCalls.push(args);
  }
  stop(...args) {
    this.stopCalls.push(args);
  }
}

export function createFakeAudio({ sampleRate = 100, throws = false } = {}) {
  const nodes = [];
  const state = { ctx: null };

  class FakeAudioContext {
    constructor() {
      if (throws) throw new Error("no audio");
      this.sampleRate = sampleRate;
      this.currentTime = 0;
      this.state = "suspended";
      this.resumeCalls = 0;
      this.suspendCalls = 0;
      this.destination = new FakeNode("destination");
      state.ctx = this;
    }
    track(node) {
      nodes.push(node);
      return node;
    }
    createGain() {
      return this.track(new FakeNode("gain", { gain: 1 }));
    }
    createBiquadFilter() {
      const node = this.track(new FakeNode("biquad", { frequency: 350, Q: 1 }));
      node.type = "lowpass";
      return node;
    }
    createOscillator() {
      return this.track(new FakeNode("oscillator", { frequency: 440 }));
    }
    createBufferSource() {
      return this.track(new FakeNode("bufferSource"));
    }
    createConvolver() {
      return this.track(new FakeNode("convolver"));
    }
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { numberOfChannels: channels, length, sampleRate: rate, getChannelData: c => data[c] };
    }
    resume() {
      this.resumeCalls++;
      this.state = "running";
    }
    suspend() {
      this.suspendCalls++;
      this.state = "suspended";
    }
  }

  return { AudioContext: FakeAudioContext, nodes, ctx: () => state.ctx };
}
