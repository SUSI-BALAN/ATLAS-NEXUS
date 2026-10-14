import { describe, expect, it } from "vitest";
import { CLONE_LIMITS, CloneServiceError, isolatedGitEnvironment, validateGitTree } from "./cloneService.js";

describe("clone security policy", () => {
  it("isolates inherited Git configuration, credentials, and LFS smudge", () => {
    const env = isolatedGitEnvironment("D:\\Temp\\owned-stage");
    expect(env).toMatchObject({
      HOME: "D:\\Temp\\owned-stage", USERPROFILE: "D:\\Temp\\owned-stage", GIT_CONFIG_NOSYSTEM: "1",
      GIT_CONFIG_GLOBAL: "NUL", GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never", GIT_LFS_SKIP_SMUDGE: "1", GIT_ALLOW_PROTOCOL: "https"
    });
    expect(env.GIT_SSH_COMMAND).toBeUndefined();
  });

  it("accepts ordinary blobs and submodule pointers without initializing submodules", () => {
    expect(() => validateGitTree("100644 blob abcdef\tREADME.md\0" + "160000 commit abcdef\tvendor/module\0")).not.toThrow();
  });

  it("rejects symlinks and Windows-unsafe tree paths before checkout", () => {
    expect(() => validateGitTree("120000 blob abcdef\tescape\0")).toThrowError(CloneServiceError);
    expect(() => validateGitTree("100644 blob abcdef\tCON.txt\0")).toThrow();
    expect(() => validateGitTree("100644 blob abcdef\tdir/bad:name\0")).toThrow();
  });

  it("defines bounded resources and disables automatic retries", () => {
    expect(CLONE_LIMITS).toMatchObject({ concurrentJobs: 1, durationMs: 900000, outputBytes: 1000000, files: 50000, automaticRetries: 0 });
  });
});
