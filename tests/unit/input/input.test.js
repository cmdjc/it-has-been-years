// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInput } from "../../../src/input/input.js";

const bodyHtml = readFileSync("index.html", "utf8").match(/<body>([\s\S]*)<\/body>/)[1];

const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code }));
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
  beforeEach(() => {
    document.body.innerHTML = bodyHtml;
    canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    window.innerWidth = 1000;
    input = createInput(canvas, window);
  });
  afterEach(() => input.dispose());

  it("reads key axes", () => {
    key("keydown", "KeyW");
    key("keydown", "ArrowRight");
    expect(input.axes()).toEqual({ fwd: 1, str: 1, run: false });
    key("keyup", "KeyW");
    key("keydown", "ArrowDown");
    key("keydown", "KeyA");
    key("keyup", "ArrowRight");
    expect(input.axes()).toEqual({ fwd: -1, str: -1, run: false });
    expect(input.keyAxes()).toEqual({ fwd: -1, str: -1 });
  });

  it("opposite keys cancel", () => {
    key("keydown", "KeyW");
    key("keydown", "KeyS");
    expect(input.axes().fwd).toBe(0);
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

  it("accumulates mouse drag look and resets", () => {
    mouse(window, "mousemove", 5, 5);
    expect(input.takeLook()).toEqual({ yaw: 0, pitch: 0 });
    mouse(canvas, "mousedown", 100, 100);
    mouse(window, "mousemove", 110, 120);
    mouse(window, "mousemove", 120, 120);
    const look = input.takeLook();
    expect(look.yaw).toBeCloseTo(-20 * 0.0035);
    expect(look.pitch).toBeCloseTo(-20 * 0.0035);
    expect(input.takeLook()).toEqual({ yaw: 0, pitch: 0 });
    mouse(window, "mouseup");
    mouse(window, "mousemove", 200, 200);
    expect(input.takeLook()).toEqual({ yaw: 0, pitch: 0 });
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
    expect(input.joystick()).toEqual({ x: 1, y: -0 });
    expect(knob.style.transform).toBe("translate(55px,0px)");
    expect(input.axes()).toMatchObject({ fwd: 0, str: 1 });
    touch(canvas, "touchmove", [[1, 200, 245]]);
    expect(input.joystick().y).toBeCloseTo(1);
  });

  it("right-half touch looks at 0.0052 per px", () => {
    touch(canvas, "touchstart", [[2, 700, 300]]);
    touch(canvas, "touchmove", [[2, 710, 320]]);
    const look = input.takeLook();
    expect(look.yaw).toBeCloseTo(-10 * 0.0052);
    expect(look.pitch).toBeCloseTo(-20 * 0.0052);
    expect(input.joystick()).toEqual({ x: 0, y: 0 });
  });

  it("handles two touches and releases by identifier", () => {
    const joyEl = document.getElementById("joy");
    touch(canvas, "touchstart", [[1, 100, 300]]);
    touch(canvas, "touchstart", [[2, 700, 300]]);
    touch(canvas, "touchmove", [[1, 100, 250], [2, 705, 300]]);
    expect(input.joystick().y).toBeCloseTo(50 / 55);
    expect(input.takeLook().yaw).toBeCloseTo(-5 * 0.0052);
    touch(canvas, "touchend", [[2, 705, 300]]);
    expect(joyEl.style.display).toBe("block");
    expect(input.joystick().y).toBeCloseTo(50 / 55);
    touch(canvas, "touchmove", [[2, 800, 300]]);
    expect(input.takeLook()).toEqual({ yaw: 0, pitch: 0 });
    touch(canvas, "touchcancel", [[1, 100, 250]]);
    expect(joyEl.style.display).toBe("none");
    expect(input.joystick()).toEqual({ x: 0, y: 0 });
  });

  it("second left-half touch does not claim the joystick but claims look", () => {
    touch(canvas, "touchstart", [[1, 100, 300]]);
    touch(canvas, "touchstart", [[2, 200, 300]]);
    touch(canvas, "touchmove", [[2, 210, 300]]);
    expect(input.takeLook().yaw).toBeCloseTo(-10 * 0.0052);
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
});
