// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { createOverlay } from "../../../src/ui/overlay.js";
import { createScheduler } from "../../../src/core/scheduler.js";

const bodyHtml = readFileSync("index.html", "utf8").match(/<body>([\s\S]*)<\/body>/)[1];
const $ = (id) => document.getElementById(id);

describe("overlay", () => {
  let scheduler;
  let overlay;
  beforeEach(() => {
    document.body.innerHTML = bodyHtml;
    scheduler = createScheduler();
    overlay = createOverlay(document, scheduler);
  });

  it("toggles the curtain", () => {
    overlay.curtainOff();
    expect($("white").classList.contains("off")).toBe(true);
    overlay.curtainOn();
    expect($("white").classList.contains("off")).toBe(false);
  });

  it("sets text and toggles text visibility", () => {
    overlay.setText("4 years", "sub line");
    expect($("yrs").textContent).toBe("4 years");
    expect($("sub").textContent).toBe("sub line");
    overlay.textOn();
    expect($("white").classList.contains("txt")).toBe(true);
    overlay.textOff();
    expect($("white").classList.contains("txt")).toBe(false);
  });

  it("shows a hint and removes it after 7.5 s", () => {
    overlay.hint("Go");
    expect($("hint").textContent).toBe("Go");
    expect($("hint").classList.contains("on")).toBe(true);
    scheduler.advance(7.4);
    expect($("hint").classList.contains("on")).toBe(true);
    scheduler.advance(0.1);
    expect($("hint").classList.contains("on")).toBe(false);
  });

  it("a second hint cancels the first removal", () => {
    overlay.hint("one");
    scheduler.advance(5);
    overlay.hint("two");
    scheduler.advance(3);
    expect($("hint").classList.contains("on")).toBe(true);
    expect($("hint").textContent).toBe("two");
    scheduler.advance(4.5);
    expect($("hint").classList.contains("on")).toBe(false);
  });

  it("hintOn and hintOff cancel pending removal", () => {
    overlay.hint("x");
    overlay.hintOn();
    scheduler.advance(10);
    expect($("hint").classList.contains("on")).toBe(true);
    overlay.hintOff();
    expect($("hint").classList.contains("on")).toBe(false);
    expect($("hint").textContent).toBe("x");
  });

  it("hides the start screen", () => {
    overlay.hideStart();
    expect($("start").style.display).toBe("none");
  });

  it("shows the end card and fades it in on the next frame", async () => {
    overlay.showEnd("<b>done</b>");
    expect($("endtxt").innerHTML).toBe("<b>done</b>");
    expect($("end").style.display).toBe("flex");
    await new Promise((resolve) => document.defaultView.requestAnimationFrame(resolve));
    expect($("end").style.opacity).toBe("1");
  });

  it("sets beam glow", () => {
    overlay.beamGlow(0.6);
    expect($("bfx").style.opacity).toBe("0.6");
  });

  it("wires begin and again clicks", () => {
    const calls = [];
    overlay.onBegin(() => calls.push("go"));
    overlay.onAgain(() => calls.push("again"));
    $("go").click();
    $("again").click();
    expect(calls).toEqual(["go", "again"]);
  });
});
