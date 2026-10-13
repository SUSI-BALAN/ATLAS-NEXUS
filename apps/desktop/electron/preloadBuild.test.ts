import { describe, expect, it } from "vitest";
import config from "../electron.vite.config.js";

describe("preload build contract", () => {
  it("emits one fully bundled CommonJS preload with a stable filename", () => {
    expect(config).toBeTypeOf("object");
    const preload = (config as { preload?: { plugins?: unknown[]; build?: { lib?: { formats?: string[] }; rollupOptions?: { output?: { format?: string; entryFileNames?: string; inlineDynamicImports?: boolean } } } } }).preload;
    expect(preload?.plugins).toBeUndefined();
    expect(preload?.build?.lib?.formats).toEqual(["cjs"]);
    expect(preload?.build?.rollupOptions?.output).toMatchObject({ format: "cjs", entryFileNames: "index.cjs", inlineDynamicImports: true });
  });
});
