import * as THREE from "three";

export const TEXTURE_SIZES = {
  tile: { w: 256, h: 256 },
  caustic: { w: 256, h: 256 },
  shade: { w: 64, h: 64 },
  stair: { w: 8, h: 64 },
  tower: { w: 512, h: 512 },
  fall: { w: 64, h: 256 },
  door: { w: 256, h: 256 },
  wall: { w: 512, h: 512 },
  sign: { w: 512, h: 128 },
};

export function canvasTex(env, w, h, draw, rx = 1, ry = 1) {
  const canvas = env.createCanvas(w, h);
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext("2d"), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(rx, ry);
  texture.anisotropy = env.anisotropy;
  return texture;
}

export const tilePainter = (base, grout, spread, rng) => (g) => {
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const v = 1 - rng() * spread;
    g.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`; g.fillRect(i * 128, j * 128, 128, 128);
    g.fillStyle = "rgba(255,255,255,.35)"; g.fillRect(i * 128 + 4, j * 128 + 4, 120, 3); g.fillRect(i * 128 + 4, j * 128 + 4, 3, 120);
  }
  g.strokeStyle = grout; g.lineWidth = 5; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
};

export const causticPainter = (rng) => (g, w, h) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(190,255,255,.9)"; g.shadowColor = "rgba(190,255,255,1)"; g.shadowBlur = 6; g.lineWidth = 2;
  for (let i = 0; i < 26; i++) { g.beginPath(); const x = rng() * w, y = rng() * h; g.moveTo(x, y); g.bezierCurveTo(x + 40, y - 30, x + 70, y + 40, x + 110, y + 8); g.stroke(); g.moveTo(x - w, y); }
};

export const shadePainter = () => (g) => {
  g.shadowColor = "rgba(0,50,70,1)"; g.shadowBlur = 12; g.fillStyle = "rgba(0,50,70,1)"; g.fillRect(16, 16, 32, 32);
};

export const stairPainter = () => (g, w, h) => {
  g.fillStyle = "#eef6f6"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#c3dde0"; g.fillRect(0, 40, w, 6);
  g.fillStyle = "#79d3db"; g.fillRect(0, 46, w, 18);
};

export const towerPainter = () => (g, w, h) => {
  g.fillStyle = "#f3f9f9"; g.fillRect(0, 0, w, h);
  const c = 64;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const x = i * c + c / 2, y = j * c + c / 2;
    g.strokeStyle = "#c4e3e6"; g.lineWidth = 2; g.strokeRect(i * c + 1, j * c + 1, c - 2, c - 2);
    g.fillStyle = "#2c8f9b"; g.beginPath(); g.moveTo(x - 14, y + 22); g.lineTo(x - 14, y - 4); g.arc(x, y - 4, 14, Math.PI, 0); g.lineTo(x + 14, y + 22); g.closePath(); g.fill();
    g.fillStyle = "#7fd6de"; g.fillRect(x - 17, y + 22, 34, 4);
  }
};

export const fallPainter = (rng) => (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(150,236,244,.75)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(255,255,255,.55)"; for (let i = 0; i < 9; i++) g.fillRect(rng() * w, 0, 2 + rng() * 4, h);
};

export const doorPainter = () => (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b4a55"); gr.addColorStop(0.7, "#0e5c68"); gr.addColorStop(1, "#fff1c9");
  g.fillStyle = gr; g.beginPath(); g.moveTo(20, h); g.lineTo(20, 110); g.arc(128, 110, 108, Math.PI, 0); g.lineTo(236, h); g.closePath(); g.fill();
};

export const wallPainter = () => (g, w, h) => {
  g.fillStyle = "#f1f8f8"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#cfe6e9"; g.lineWidth = 2;
  for (let i = 0; i <= 16; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); }
  const gr = g.createLinearGradient(0, 90, 0, 420); gr.addColorStop(0, "#12606c"); gr.addColorStop(1, "#46b5c1");
  g.fillStyle = gr; g.beginPath(); g.moveTo(176, 420); g.lineTo(176, 170); g.arc(256, 170, 80, Math.PI, 0); g.lineTo(336, 420); g.closePath(); g.fill();
  g.fillStyle = "#7fd6de"; g.fillRect(160, 420, 192, 12); g.fillRect(0, 498, w, 14);
};

export const signPainter = (text, color) => (c, w, h) => {
  c.fillStyle = color; c.fillRect(0, 0, w, h); c.strokeStyle = "#f4fafa"; c.lineWidth = 6; c.strokeRect(7, 7, w - 14, h - 14); c.fillStyle = "#f4fafa"; c.font = "bold 50px Helvetica, Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, w / 2, h / 2 + 3);
};
