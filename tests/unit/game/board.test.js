import { describe, it, expect } from "vitest";
import { boardShape, onBoard, boardTarget, stepBoard } from "../../../src/game/board.js";
import { TOP } from "../../../src/config.js";

describe("boardShape", () => {
  it("is 0 at the root, 0.5 at the middle by the smooth formula, 1 at the end, and clamps beyond", () => {
    expect(boardShape(0)).toBe(0);
    expect(boardShape(-5)).toBe(0);
    expect(boardShape(TOP.BOARD_L / 2)).toBeCloseTo(0.5 * 0.5 * 2.5 / 2, 12);
    expect(boardShape(TOP.BOARD_L)).toBe(1);
    expect(boardShape(TOP.BOARD_L * 3)).toBe(1);
  });
});

describe("onBoard", () => {
  it("requires z < -696 and |x| < 0.8", () => {
    expect(onBoard(0, -697)).toBe(true);
    expect(onBoard(0.79, -697)).toBe(true);
    expect(onBoard(0.8, -697)).toBe(false);
    expect(onBoard(0, -696)).toBe(false);
  });
});

describe("boardTarget", () => {
  it("uses the dive phase when diving", () => {
    expect(boardTarget({ x: 0, z: -800, divePhase: "crouch" })).toBe(-0.55);
    expect(boardTarget({ x: 0, z: -800, divePhase: "fall" })).toBe(0);
  });
  it("follows the board shape otherwise", () => {
    expect(boardTarget({ x: 0, z: -698 - TOP.BOARD_L, divePhase: null })).toBeCloseTo(-0.16, 12);
    expect(boardTarget({ x: 0, z: -698 - TOP.BOARD_L / 2, divePhase: null })).toBeCloseTo(-0.16 * boardShape(TOP.BOARD_L / 2), 12);
    expect(boardTarget({ x: 2, z: -800, divePhase: null })).toBe(0);
    expect(boardTarget({ x: 0, z: -100, divePhase: null })).toBe(0);
  });
});

describe("stepBoard", () => {
  it("moves negative from rest toward a negative target", () => {
    const board = { x: 0, v: 0 };
    stepBoard(board, -0.16, 1 / 60);
    expect(board.v).toBeCloseTo(-89 * 0.16 / 60, 12);
    expect(board.x).toBeCloseTo(board.v / 60, 12);
    expect(board.x).toBeLessThan(0);
  });
  it("settles near the target after 10 s", () => {
    const board = { x: 0, v: 0 };
    for (let i = 0; i < 600; i++) stepBoard(board, -0.16, 1 / 60);
    expect(board.x).toBeCloseTo(-0.16, 4);
    expect(Math.abs(board.v)).toBeLessThan(1e-4);
  });
});
