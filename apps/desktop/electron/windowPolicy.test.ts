import { describe, expect, it } from "vitest";
import { secureWindowOptions } from "./windowPolicy.js";

describe("secureWindowOptions", () => {
  it("enforces the renderer security boundary", () => {
    const options = secureWindowOptions("preload.js");
    expect(options.webPreferences).toMatchObject({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false });
  });
});
