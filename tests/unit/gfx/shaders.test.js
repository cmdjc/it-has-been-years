import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as shaders from "../../../src/gfx/shaders.js";

const legacyLines = readFileSync(new URL("../../../legacy/it-has-been-years.html", import.meta.url), "utf8").split("\n");

const literalsIn = (from, to) => {
  const text = legacyLines.slice(from - 1, to).join("\n");
  const literals = [...text.matchAll(/"((?:[^"\\\n])*)"|`([^`]*)`/g)].map((match) => match[1] ?? match[2]);
  return literals.join("\n").split("\n").map((line) => line.trim()).filter(Boolean);
};

const REMOVED_REFLECTION_LINES = new Set([
  "uniform float time; uniform vec3 sunDir; uniform float space; uniform sampler2D tRefl; uniform vec2 uRes; uniform float uUse; varying vec3 vW;",
  "if (uUse > 0.5) {",
  "vec2 suv = gl_FragCoord.xy / uRes;",
  "vec2 ruv = vec2(suv.x + N.x * 0.12, 1.0 - suv.y + N.z * 0.12);",
  "float br = clamp(0.0012 + dist * 0.000012, 0.0012, 0.012);",
  "refl = (texture2D(tRefl, clamp(ruv, 0.003, 0.997)).rgb * 2.0 + texture2D(tRefl, clamp(ruv + vec2(br, 0.0), 0.003, 0.997)).rgb + texture2D(tRefl, clamp(ruv - vec2(br, 0.0), 0.003, 0.997)).rgb",
  "+ texture2D(tRefl, clamp(ruv + vec2(0.0, br * 1.5), 0.003, 0.997)).rgb + texture2D(tRefl, clamp(ruv - vec2(0.0, br * 1.5), 0.003, 0.997)).rgb) / 6.0;",
  "refl *= 0.88;",
]);

const expectCopied = (exported, from, to, removed = new Set()) => {
  const lines = literalsIn(from, to).filter((line) => !removed.has(line));
  expect(lines.length).toBeGreaterThan(0);
  lines.forEach((line) => expect(exported).toContain(line));
};

describe("shaders", () => {
  it("copies the sky GLSL", () => {
    expectCopied(shaders.SKY_GLSL, 85, 99);
    expectCopied(shaders.SKY_VERT, 105, 105);
    expectCopied(shaders.SKY_FRAG, 106, 106);
    expectCopied(shaders.SKY_FRAG, 85, 99);
  });

  it("copies the water GLSL without the planar reflection path", () => {
    expectCopied(shaders.WATER_VERT, 116, 116);
    expectCopied(shaders.WATER_FRAG, 117, 143, REMOVED_REFLECTION_LINES);
    expect(shaders.WATER_FRAG).not.toContain("tRefl");
    expect(shaders.WATER_FRAG).not.toContain("uUse");
    expect(shaders.WATER_FRAG).not.toContain("uRes");
    expect(shaders.WATER_FRAG).toContain("uniform float time; uniform vec3 sunDir; uniform float space; varying vec3 vW;");
    expect(shaders.WATER_FRAG).toContain("vec3 refl = skyColor(R);");
  });

  it("copies the planet GLSL", () => {
    expectCopied(shaders.PLANET_VERT, 152, 152);
    expectCopied(shaders.PLANET_FRAG, 153, 162);
  });

  it("copies the beam GLSL", () => {
    expectCopied(shaders.BEAM_VERT, 551, 551);
    expectCopied(shaders.BEAM_FRAG, 552, 552);
  });

  it("copies the eye GLSL", () => {
    expectCopied(shaders.EYE_VERT, 845, 845);
    expectCopied(shaders.EYE_FRAG, 846, 879);
  });

  it("copies the post-processing GLSL", () => {
    expectCopied(shaders.FS_VERT, 1076, 1076);
    expectCopied(shaders.BRIGHT_FRAG, 1077, 1077);
    expectCopied(shaders.BLUR_FRAG, 1078, 1078);
    expectCopied(shaders.FINAL_FRAG, 1081, 1094);
  });
});
