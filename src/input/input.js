import { clamp } from "../core/math.js";

const MOUSE_LOOK = 0.0035;
const TOUCH_LOOK = 0.0052;
const JOY_RADIUS = 55;

export function createInput(canvas, win, onLook, onKey = () => {}) {
  const doc = win.document;
  const joyEl = doc.getElementById("joy");
  const knob = doc.getElementById("knob");
  const keys = {};
  let jx = 0;
  let jy = 0;
  let touchRise = 0;
  let joyId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let lookId = null;
  let lastX = 0;
  let lastY = 0;
  let dragging = false;

  const addLook = (dx, dy, scale) => onLook(-dx * scale, -dy * scale);

  const onKeyDown = (e) => {
    keys[e.code] = true;
    if (e.code === "Space") e.preventDefault();
    if (!e.repeat) onKey(e.code);
  };
  const onKeyUp = (e) => { keys[e.code] = false; };
  const onMouseDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onMouseUp = () => { dragging = false; };
  const onMouseMove = (e) => {
    if (!dragging) return;
    addLook(e.clientX - lastX, e.clientY - lastY, MOUSE_LOOK);
    lastX = e.clientX;
    lastY = e.clientY;
  };
  const onTouchStart = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.clientX < win.innerWidth * 0.5 && joyId === null) {
        joyId = t.identifier;
        joyOriginX = t.clientX;
        joyOriginY = t.clientY;
        joyEl.style.display = "block";
        joyEl.style.left = joyOriginX + "px";
        joyEl.style.top = joyOriginY + "px";
        knob.style.transform = "";
      } else if (lookId === null) {
        lookId = t.identifier;
        lastX = t.clientX;
        lastY = t.clientY;
      }
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        let dx = t.clientX - joyOriginX;
        let dy = t.clientY - joyOriginY;
        const dist = Math.hypot(dx, dy);
        if (dist > JOY_RADIUS) {
          dx = (dx / dist) * JOY_RADIUS;
          dy = (dy / dist) * JOY_RADIUS;
        }
        jx = dx / JOY_RADIUS;
        jy = -dy / JOY_RADIUS;
        knob.style.transform = `translate(${dx}px,${dy}px)`;
      } else if (t.identifier === lookId) {
        addLook(t.clientX - lastX, t.clientY - lastY, TOUCH_LOOK);
        lastX = t.clientX;
        lastY = t.clientY;
      }
    }
  };
  const onTouchEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        joyId = null;
        jx = 0;
        jy = 0;
        joyEl.style.display = "none";
      }
      if (t.identifier === lookId) lookId = null;
    }
  };
  const onContextMenu = (e) => e.preventDefault();

  const winListeners = [
    ["keydown", onKeyDown],
    ["keyup", onKeyUp],
    ["mouseup", onMouseUp],
    ["mousemove", onMouseMove],
    ["contextmenu", onContextMenu],
  ];
  const canvasListeners = [
    ["mousedown", onMouseDown, undefined],
    ["touchstart", onTouchStart, { passive: false }],
    ["touchmove", onTouchMove, { passive: false }],
    ["touchend", onTouchEnd, undefined],
    ["touchcancel", onTouchEnd, undefined],
  ];
  winListeners.forEach(([type, fn]) => win.addEventListener(type, fn));
  canvasListeners.forEach(([type, fn, opts]) => canvas.addEventListener(type, fn, opts));

  return {
    axes() {
      const fwd = Number(keys.KeyW || keys.ArrowUp || 0) - Number(keys.KeyS || keys.ArrowDown || 0);
      const str = Number(keys.KeyD || keys.ArrowRight || 0) - Number(keys.KeyA || keys.ArrowLeft || 0);
      const rise = Number(keys.Space || keys.KeyE || 0) - Number(keys.KeyC || keys.KeyQ || 0) + touchRise;
      return { fwd: jy + fwd, str: jx + str, run: Boolean(keys.ShiftLeft || keys.ShiftRight), rise: clamp(rise, -1, 1) };
    },
    setRise(value) { touchRise = value; },
    dispose() {
      winListeners.forEach(([type, fn]) => win.removeEventListener(type, fn));
      canvasListeners.forEach(([type, fn, opts]) => canvas.removeEventListener(type, fn, opts));
    },
  };
}
