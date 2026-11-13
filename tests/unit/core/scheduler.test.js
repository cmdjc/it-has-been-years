import { describe, it, expect } from "vitest";
import { createScheduler } from "../../../src/core/scheduler.js";

describe("createScheduler", () => {
  it("starts at time 0 and advances now", () => {
    const s = createScheduler();
    expect(s.now).toBe(0);
    s.advance(1.5);
    expect(s.now).toBe(1.5);
  });

  it("fires only due callbacks", () => {
    const s = createScheduler();
    const fired = [];
    s.after(1, () => fired.push("a"));
    s.after(3, () => fired.push("b"));
    s.advance(2);
    expect(fired).toEqual(["a"]);
    s.advance(1);
    expect(fired).toEqual(["a", "b"]);
  });

  it("fires ties in insertion order", () => {
    const s = createScheduler();
    const fired = [];
    s.after(1, () => fired.push("first"));
    s.after(1, () => fired.push("second"));
    s.after(1, () => fired.push("third"));
    s.advance(1);
    expect(fired).toEqual(["first", "second", "third"]);
  });

  it("fires a callback scheduled during advance in the same advance when due", () => {
    const s = createScheduler();
    const fired = [];
    s.after(1, () => {
      fired.push("a");
      s.after(1, () => fired.push("nested"));
      s.after(10, () => fired.push("late"));
    });
    s.after(3, () => fired.push("b"));
    s.advance(5);
    expect(fired).toEqual(["a", "nested", "b"]);
    s.advance(10);
    expect(fired).toEqual(["a", "nested", "b", "late"]);
  });

  it("shows each callback its own due time, then ends at the advanced time", () => {
    const s = createScheduler();
    const seen = [];
    s.after(0.5, () => seen.push(s.now));
    s.after(2, () => seen.push(s.now));
    s.advance(4);
    expect(seen).toEqual([0.5, 2]);
    expect(s.now).toBe(4);
  });

  it("cancels pending callbacks and ignores unknown or fired ids", () => {
    const s = createScheduler();
    const fired = [];
    const id = s.after(1, () => fired.push("x"));
    const doneId = s.after(0.5, () => fired.push("y"));
    s.cancel(id);
    s.advance(2);
    expect(fired).toEqual(["y"]);
    expect(() => s.cancel(doneId)).not.toThrow();
    expect(() => s.cancel(9999)).not.toThrow();
  });

  it("clear drops all pending callbacks", () => {
    const s = createScheduler();
    const fired = [];
    s.after(1, () => fired.push("x"));
    s.clear();
    s.advance(5);
    expect(fired).toEqual([]);
  });

  it("fires the timeline timers in order on one big advance", () => {
    const s = createScheduler();
    const fired = [];
    for (const t of [10.8, 7.6, 0.2, 9.0, 1.9]) s.after(t, () => fired.push(t));
    s.advance(20);
    expect(fired).toEqual([0.2, 1.9, 7.6, 9.0, 10.8]);
    expect(s.now).toBe(20);
  });
});
