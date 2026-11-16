// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInput } from "../../../src/input/input.js";

const bodyHtml = readFileSync("index.html", "utf8").match(/<body>([\s\S]*)<\/body>/)[1];

const key = (type, code, init = {}) => window.dispatchEvent(new KeyboardEvent(type, { code, cancelable: true, ...init }));
const mouse = (target, type, x, y) => target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
const touch = (target, type, points) => {
  const event = new Event(type, { cancelable: true, bubbles: true });
  Object.defineProperty(event, "changedTouches", { value: points.map(([identifier, clientX, clientY]) => ({ identifier, clientX, clientY })) });
  target.dispatchEvent(event);
  return event;
};

describe("input", () => {
  let canvas;
  let input;
  let looks;
  let keyDowns;
  beforeEach(() => {
    document.body.innerHTML = bodyHtml;
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    window.innerWidth = 1000;
    looks = [];
    keyDowns = [];
    input = createInput(canvas, window, (dYaw, dPitch) => looks.push([dYaw, dPitch]), (code) => keyDowns.push(code));
  });
  afterEach(() => input.dispose());

  it("reads key axes", () => {
    key("keydown", "KeyW");
    key("keydown", "ArrowRight");
    expect(input.axes()).toEqual({ fwd: 1, str: 1, run: false, rise: 0 });
    key("keyup", "KeyW");
    key("keydown", "ArrowDown");
    key("keydown", "KeyA");
    key("keyup", "ArrowRight");
    expect(input.axes()).toEqual({ fwd: -1, str: -1, run: false, rise: 0 });
  });

  it("opposite keys cancel", () => {
    key("keydown", "KeyW");
    key("keydown", "KeyS");
    expect(input.axes().fwd).toBe(0);
  });

  it("treats alias keys as one key", () => {
    key("keydown", "KeyW");
    key("keydown", "ArrowUp");
    expect(input.axes().fwd).toBe(1);
    key("keydown", "KeyS");
    expect(input.axes().fwd).toBe(0);
    key("keydown", "KeyD");
    key("keydown", "ArrowRight");
    expect(input.axes().str).toBe(1);
  });

  it("reports shift as run", () => {
    key("keydown", "ShiftLeft");
    expect(input.axes().run).toBe(true);
    key("keyup", "ShiftLeft");
    key("keydown", "ShiftRight");
    expect(input.axes().run).toBe(true);
    key("keyup", "ShiftRight");
    expect(input.axes().run).toBe(false);
  });

  it("calls onLook per mouse move while dragging", () => {
    mouse(window, "mousemove", 5, 5);
    expect(looks).toEqual([]);
    mouse(canvas, "mousedown", 100, 100);
    mouse(window, "mousemove", 110, 120);
    mouse(window, "mousemove", 120, 120);
    expect(looks).toHaveLength(2);
    expect(looks[0][0]).toBeCloseTo(-10 * 0.0035);
    expect(looks[0][1]).toBeCloseTo(-20 * 0.0035);
    expect(looks[1][0]).toBeCloseTo(-10 * 0.0035);
    expect(looks[1][1]).toBeCloseTo(0);
    mouse(window, "mouseup");
    mouse(window, "mousemove", 200, 200);
    expect(looks).toHaveLength(2);
  });

  it("clamps pitch after each event when feeding a clamping look", () => {
    let pitch = 1.5;
    input.dispose();
    input = createInput(canvas, window, (_dYaw, dPitch) => { pitch = Math.max(-1.5, Math.min(1.5, pitch + dPitch)); });
    mouse(canvas, "mousedown", 0, 500);
    mouse(window, "mousemove", 0, 400);
    mouse(window, "mousemove", 0, 500);
    expect(pitch).toBeCloseTo(1.5 - 0.35, 9);
  });

  it("left-half touch drives the joystick with radius clamp", () => {
    const joyEl = document.getElementById("joy");
    const knob = document.getElementById("knob");
    const start = touch(canvas, "touchstart", [[1, 200, 300]]);
    expect(start.defaultPrevented).toBe(true);
    expect(joyEl.style.display).toBe("block");
    expect(joyEl.style.left).toBe("200px");
    expect(joyEl.style.top).toBe("300px");
    touch(canvas, "touchmove", [[1, 310, 300]]);
    expect(knob.style.transform).toBe("translate(55px,0px)");
    expect(input.axes()).toMatchObject({ fwd: 0, str: 1 });
    touch(canvas, "touchmove", [[1, 200, 245]]);
  });

  it("right-half touch looks at 0.0052 per px", () => {
    touch(canvas, "touchstart", [[2, 700, 300]]);
    touch(canvas, "touchmove", [[2, 710, 320]]);
    expect(looks).toHaveLength(1);
    expect(looks[0][0]).toBeCloseTo(-10 * 0.0052);
    expect(looks[0][1]).toBeCloseTo(-20 * 0.0052);
  });

  it("handles two touches and releases by identifier", () => {
    const joyEl = document.getElementById("joy");
    touch(canvas, "touchstart", [[1, 100, 300]]);
    touch(canvas, "touchstart", [[2, 700, 300]]);
    touch(canvas, "touchmove", [[1, 100, 250], [2, 705, 300]]);
    expect(looks[0][0]).toBeCloseTo(-5 * 0.0052);
    touch(canvas, "touchend", [[2, 705, 300]]);
    expect(joyEl.style.display).toBe("block");
    touch(canvas, "touchmove", [[2, 800, 300]]);
    expect(looks).toHaveLength(1);
    touch(canvas, "touchcancel", [[1, 100, 250]]);
    expect(joyEl.style.display).toBe("none");
  });

  it("second left-half touch does not claim the joystick but claims look", () => {
    touch(canvas, "touchstart", [[1, 100, 300]]);
    touch(canvas, "touchstart", [[2, 200, 300]]);
    touch(canvas, "touchmove", [[2, 210, 300]]);
    expect(looks[0][0]).toBeCloseTo(-10 * 0.0052);
  });

  it("prevents the context menu", () => {
    const event = new Event("contextmenu", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("dispose removes listeners", () => {
    input.dispose();
    key("keydown", "KeyW");
    expect(input.axes().fwd).toBe(0);
    const event = new Event("contextmenu", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    touch(canvas, "touchstart", [[1, 100, 300]]);
    expect(document.getElementById("joy").style.display).not.toBe("block");
  });

  it("reads rise from Space, E, C, and Q", () => {
    expect(input.axes().rise).toBe(0);
    key("keydown", "Space");
    expect(input.axes().rise).toBe(1);
    key("keyup", "Space");
    key("keydown", "KeyE");
    expect(input.axes().rise).toBe(1);
    key("keyup", "KeyE");
    key("keydown", "KeyC");
    expect(input.axes().rise).toBe(-1);
    key("keyup", "KeyC");
    key("keydown", "KeyQ");
    expect(input.axes().rise).toBe(-1);
  });

  it("cancels opposite rise keys and combines with touch rise", () => {
    key("keydown", "Space");
    key("keydown", "KeyQ");
    expect(input.axes().rise).toBe(0);
    key("keyup", "Space");
    input.setRise(1);
    expect(input.axes().rise).toBe(0);
    key("keyup", "KeyQ");
    expect(input.axes().rise).toBe(1);
    key("keydown", "KeyE");
    expect(input.axes().rise).toBe(1);
    input.setRise(0);
    expect(input.axes().rise).toBe(1);
  });

  it("calls onKey once per keydown and ignores repeats", () => {
    key("keydown", "KeyP");
    key("keydown", "KeyP", { repeat: true });
    key("keyup", "KeyP");
    expect(keyDowns).toEqual(["KeyP"]);
  });

  it("leaves Space alone on a focused button", () => {
    const button = document.getElementById("go");
    const event = new KeyboardEvent("keydown", { code: "Space", cancelable: true, bubbles: true });
    button.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(input.axes().rise).toBe(0);
    const onBody = new KeyboardEvent("keydown", { code: "Space", cancelable: true, bubbles: true });
    document.body.dispatchEvent(onBody);
    expect(onBody.defaultPrevented).toBe(true);
    expect(key("keydown", "Space")).toBe(false);
  });

  it("prevents the default action for Space only", () => {
    expect(key("keydown", "Space")).toBe(false);
    expect(key("keydown", "KeyW")).toBe(true);
  });
});
