// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");
const doc = new globalThis.DOMParser().parseFromString(read("index.html"), "text/html");

const ids = ["joy", "knob", "bfx", "hint", "white", "yrs", "sub", "start", "go", "end", "endtxt", "again"];

describe("index.html shell", () => {
  it("has the title", () => {
    expect(doc.title).toBe("It Has Been Years");
  });

  it.each(ids)("has element #%s", (id) => {
    expect(doc.getElementById(id)).not.toBeNull();
  });

  it("has the button and heading text", () => {
    expect(doc.getElementById("go").textContent).toBe("BEGIN");
    expect(doc.getElementById("again").textContent).toBe("WALK AGAIN");
    expect(doc.querySelector("#start h1").textContent).toBe("It has been years.");
  });

  it("loads the module entry", () => {
    expect(doc.querySelector('script[type="module"][src="/src/main.js"]')).not.toBeNull();
  });

  it("has no inline style and no CDN script", () => {
    expect(doc.querySelector("style")).toBeNull();
    expect(doc.querySelector('script[src*="cdnjs"]')).toBeNull();
  });
});

describe("style.css", () => {
  it("matches the legacy inline style", () => {
    const legacy = read("legacy/it-has-been-years.html");
    const inline = legacy.split("<style>")[1].split("</style>")[0];
    expect(read("src/ui/style.css").trim()).toBe(inline.trim());
  });
});
