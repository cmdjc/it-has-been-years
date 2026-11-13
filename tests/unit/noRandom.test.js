import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const sourceFiles = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (
  entry.isDirectory() ? sourceFiles(join(dir, entry.name)) : [join(dir, entry.name)]
));

describe("src", () => {
  it("never calls Math.random", () => {
    const offenders = sourceFiles("src").filter((file) => readFileSync(file, "utf8").includes("Math.random"));
    expect(offenders).toEqual([]);
  });
});
