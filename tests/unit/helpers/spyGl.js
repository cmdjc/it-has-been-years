export function spyGl() {
  const calls = [];
  let pixelRatio = 1;
  const gl = {
    calls,
    autoClear: true,
    domElement: {},
    capabilities: { isWebGL2: true, getMaxAnisotropy: () => 8 },
    getPixelRatio: () => pixelRatio,
    setPixelRatio: (value) => { pixelRatio = value; calls.push({ call: "setPixelRatio", value }); },
    setSize: (w, h) => calls.push({ call: "setSize", w, h }),
    setRenderTarget: (target) => calls.push({ call: "setRenderTarget", target }),
    clear: () => calls.push({ call: "clear" }),
    clearDepth: () => calls.push({ call: "clearDepth" }),
    render: (scene) => calls.push({ call: "render", scene, near: null, far: null }),
  };
  return gl;
}
