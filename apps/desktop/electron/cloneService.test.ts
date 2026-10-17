import { describe, expect, it } from "vitest";
import { BoundedGitOutput, CLONE_LIMITS, CloneServiceError, classifyGitFailure, isolatedGitEnvironment, mapCloneError, validateGitTree } from "./cloneService.js";

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
    expect(CLONE_LIMITS).toMatchObject({ concurrentJobs: 1, durationMs: 900000, diagnosticBytes: 1000000, structuredOutputBytes: 16777216, files: 50000, automaticRetries: 0 });
  });

  it.each([
    ["remote: HTTP 429 Too Many Requests - rate limit exceeded", "download", "RATE_LIMITED"],
    ["fatal: unable to access 'https://gitlab.com/a/b.git': The requested URL returned error: 503", "download", "PROVIDER_UNAVAILABLE"],
    ["remote: anti-bot challenge", "download", "PROVIDER_UNAVAILABLE"],
    ["fatal: unable to access 'https://codeberg.org/a/b.git': The requested URL returned error: 403", "download", "REPOSITORY_UNAVAILABLE"],
    ["fatal: unable to access 'https://gitea.com/a/b.git': The requested URL returned error: 401", "download", "PRIVATE_REPOSITORY"],
    ["fatal: verification object not found", "verification", "VERIFICATION_FAILED"],
    ["remote: Repository not found.", "download", "REPOSITORY_UNAVAILABLE"],
    ["fatal: Authentication failed for 'https://github.com/private/repository'", "download", "PRIVATE_REPOSITORY"],
    ["fatal: could not read Username for 'https://github.com': terminal prompts disabled", "download", "REPOSITORY_UNAVAILABLE"],
    ["fatal: unable to access: Could not resolve host: github.com", "download", "TRANSPORT_ERROR"],
    ["fatal: object file is corrupt", "verification", "VERIFICATION_FAILED"],
    ["fatal: early EOF", "download", "GIT_FAILED"]
  ] as const)("classifies safe Git failure %s", (output, operation, code) => expect(classifyGitFailure(output, operation).code).toBe(code));

  it("does not expose credential-bearing diagnostics in provider errors", () => {
    for (const suffix of ["authentication failed", "service unavailable", "rate limit exceeded", "certificate error", "early EOF"]) {
      const error = classifyGitFailure(`https://synthetic-user:synthetic-secret@v15.next.forgejo.org/a/b.git ${suffix}`, "download");
      expect(error.message).not.toMatch(/synthetic-user|synthetic-secret|https:\/\//);
    }
  });

  it.each([["EEXIST", "PATH_COLLISION"], ["EACCES", "PERMISSION_DENIED"], ["ENOSPC", "DISK_FULL"], ["EDQUOT", "DISK_FULL"]] as const)("maps filesystem fault %s", (fsCode, expected) => {
    expect(mapCloneError(Object.assign(new Error("synthetic"), { code: fsCode })).code).toBe(expected);
  });

  it("keeps structured Git output and diagnostics in separate hard-bounded buffers", () => {
    const output = new BoundedGitOutput();
    output.append("stdout", Buffer.alloc(CLONE_LIMITS.diagnosticBytes + 1, "a"));
    expect(output.stdout).toHaveLength(CLONE_LIMITS.diagnosticBytes + 1);
    expect(() => output.append("stderr", Buffer.alloc(CLONE_LIMITS.diagnosticBytes + 1, "x"))).toThrowError(expect.objectContaining({ code: "DIAGNOSTIC_LIMIT" }));
  });

  it("rejects oversized structured output without accumulating it", () => {
    const output = new BoundedGitOutput();
    expect(() => output.append("stdout", Buffer.alloc(CLONE_LIMITS.structuredOutputBytes + 1))).toThrowError(expect.objectContaining({ code: "RESOURCE_LIMIT" }));
    expect(output.stdout).toBe("");
  });

  it("adds a safe operation stage to otherwise unknown failures", () => {
    expect(mapCloneError(new Error("raw private detail"), "staging setup")).toMatchObject({ code: "INTERNAL_ERROR", message: "The clone could not be completed safely during staging setup." });
  });
});
