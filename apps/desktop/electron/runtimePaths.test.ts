import { describe, expect, it } from "vitest";
import { preloadPath } from "./runtimePaths.js";

describe("runtime paths", () => {
  it("loads the generated CommonJS preload artifact", () => {
    expect(preloadPath(String.raw`D:\Atlas\out\main`)).toBe(String.raw`D:\Atlas\out\preload\index.cjs`);
  });
});
