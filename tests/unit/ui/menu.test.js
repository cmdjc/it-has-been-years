// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { CHAPTERS } from "../../../src/config.js";
import { createMenu } from "../../../src/ui/menu.js";

const bodyHtml = readFileSync("index.html", "utf8").match(/<body>([\s\S]*)<\/body>/)[1];
const $ = (id) => document.getElementById(id);
const pressed = (el) => el.getAttribute("aria-pressed");

describe("menu", () => {
  let calls;
  let menu;
  const defaults = { speed: 1, fly: false, skip: false, stats: false };
  const open = (settings = defaults) => {
    menu = createMenu(document, {
      chapters: CHAPTERS,
      settings,
      onNew: () => calls.push(["new"]),
      onChapter: (code) => calls.push(["chapter", code]),
      onChange: (next) => calls.push(["change", next]),
    });
  };

  beforeEach(() => {
    document.body.innerHTML = bodyHtml;
    calls = [];
  });

  it("opens a panel and hides the menu and the how-to text", () => {
    open();
    $("m-credits").click();
    expect($("p-credits").hidden).toBe(false);
    expect($("menu").hidden).toBe(true);
    expect(document.querySelector("#start .how").hidden).toBe(true);
    expect($("p-chapters").hidden).toBe(true);
  });

  it("returns to the menu with BACK", () => {
    open();
    ["m-chapters", "m-credits", "m-debug"].forEach((id) => {
      $(id).click();
      document.querySelector(`#p-${id.slice(2)} .back`).click();
      expect($("menu").hidden).toBe(false);
      expect(document.querySelector("#start .how").hidden).toBe(false);
      expect(document.querySelectorAll("#start .panel:not([hidden])")).toHaveLength(0);
    });
  });

  it("returns to the menu with Escape", () => {
    open();
    $("m-debug").click();
    document.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape", bubbles: true }));
    expect($("p-debug").hidden).toBe(true);
    expect($("menu").hidden).toBe(false);
  });

  it("calls onNew from the new game button", () => {
    open();
    $("go").click();
    expect(calls).toEqual([["new"]]);
  });

  it("fills one numbered button per chapter and reports its code", () => {
    open();
    const buttons = [...document.querySelectorAll("#chapters button")];
    expect(buttons).toHaveLength(12);
    expect(buttons[0].textContent).toBe("1 The walk");
    expect(buttons[11].textContent).toBe("12 The beam");
    expect(buttons.map((button) => button.dataset.stage)).toEqual(CHAPTERS.map(([code]) => code));
    buttons[10].click();
    expect(calls).toEqual([["chapter", "TIP"]]);
  });

  it("reflects the stored settings in the toggles", () => {
    open({ speed: 16, fly: true, skip: false, stats: true });
    expect(pressed(document.querySelector('[data-speed="16"]'))).toBe("true");
    expect(pressed(document.querySelector('[data-speed="1"]'))).toBe("false");
    expect([$("d-fly"), $("d-skip"), $("d-stats")].map(pressed)).toEqual(["true", "false", "true"]);
  });

  it("changes the speed and reports a fresh object", () => {
    open();
    document.querySelector('[data-speed="64"]').click();
    expect(calls).toEqual([["change", { speed: 64, fly: false, skip: false, stats: false }]]);
    expect(pressed(document.querySelector('[data-speed="64"]'))).toBe("true");
    expect(pressed(document.querySelector('[data-speed="1"]'))).toBe("false");
    document.querySelector('[data-speed="4"]').click();
    expect(calls[1][1]).not.toBe(calls[0][1]);
    expect(calls[0][1].speed).toBe(64);
  });

  it("flips each toggle", () => {
    open();
    $("d-fly").click();
    $("d-skip").click();
    $("d-stats").click();
    expect(calls.map(([, next]) => next)).toEqual([
      { speed: 1, fly: true, skip: false, stats: false },
      { speed: 1, fly: true, skip: true, stats: false },
      { speed: 1, fly: true, skip: true, stats: true },
    ]);
    $("d-fly").click();
    expect(pressed($("d-fly"))).toBe("false");
    expect(calls[3][1].fly).toBe(false);
  });

  it("names M K and Claude in the credits", () => {
    open();
    const text = $("p-credits").textContent;
    expect(text).toContain("It Has Been Years");
    expect(text).toContain("Made by M K and Claude.");
    expect(text).toContain("Claude is an AI model by Anthropic.");
  });

  it("stops reacting after dispose", () => {
    open();
    menu.dispose();
    $("go").click();
    $("d-fly").click();
    document.querySelector("#chapters button").click();
    expect(calls).toEqual([]);
  });
});
