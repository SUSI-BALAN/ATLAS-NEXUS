import { describe, expect, it } from "vitest";
import { sanitizeDiagnosticDetail } from "./diagnosticPolicy.js";

describe("startup diagnostic policy", () => {
  it("keeps only bounded non-sensitive diagnostic fields", () => {
    const result = sanitizeDiagnosticDetail({ phase: "ready", reason: "clean-exit", token: "must-not-log", path: "C:\private", exitCode: 0 });
    expect(result).toEqual({ phase: "ready", reason: "clean-exit", exitCode: 0 });
  });
});
