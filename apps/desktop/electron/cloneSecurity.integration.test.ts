import { spawnSync } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupOwnedStage, CloneServiceError, inspectPayload, runIsolatedGitForTest } from "./cloneService.js";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("G03 hostile Git execution isolation", () => {
  it("blocks repository hooks, external filters, LFS smudge, inherited config, local transports, and recursive submodules", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "nexus-hostile-git-")); roots.push(root);
    const repository = path.join(root, "repository"); const isolatedHome = path.join(root, "isolated"); const hostileHome = path.join(root, "hostile-home");
    const hookMarker = path.join(root, "hook-executed"); const filterMarker = path.join(root, "filter-executed");
    await mkdir(repository); await mkdir(isolatedHome); await mkdir(hostileHome);
    trustedGit(["init", repository]); trustedGit(["-C", repository, "config", "user.email", "fixture@invalid.example"]); trustedGit(["-C", repository, "config", "user.name", "Fixture"]);
    await writeFile(path.join(repository, ".gitattributes"), "*.txt filter=evil\n*.lfs filter=lfs diff=lfs merge=lfs -text\n");
    await writeFile(path.join(repository, "README.txt"), "fixture\n");
    await writeFile(path.join(repository, "pointer.lfs"), "version https://git-lfs.github.com/spec/v1\noid sha256:0000000000000000000000000000000000000000000000000000000000000000\nsize 1\n");
    trustedGit(["-C", repository, "add", ".gitattributes", "README.txt", "pointer.lfs"]); trustedGit(["-C", repository, "commit", "-m", "fixture"]);
    const commit = trustedGit(["-C", repository, "rev-parse", "HEAD"]).trim();
    await writeFile(path.join(repository, ".gitmodules"), "[submodule \"vendor/sub\"]\n\tpath = vendor/sub\n\turl = file:///forbidden/submodule\n");
    trustedGit(["-C", repository, "add", ".gitmodules"]); trustedGit(["-C", repository, "update-index", "--add", "--cacheinfo", `160000,${commit},vendor/sub`]); trustedGit(["-C", repository, "commit", "-m", "hostile metadata"]);

    const hookPath = path.join(repository, ".git", "hooks", "post-checkout");
    await writeFile(hookPath, `#!/bin/sh\nprintf executed > '${hookMarker.replaceAll("\\", "/")}'\n`);
    await chmod(hookPath, 0o755);
    const hostileConfig = path.join(hostileHome, ".gitconfig");
    const markerScript = path.join(root, "filter-marker.mjs");
    await writeFile(markerScript, `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(filterMarker)}, "executed"); process.stdin.pipe(process.stdout);\n`);
    trustedGit(["config", "--file", hostileConfig, "filter.evil.smudge", `\"${process.execPath}\" \"${markerScript}\"`]);
    trustedGit(["config", "--file", hostileConfig, "url.file:///forbidden/.insteadOf", "https://github.com/"]);

    const previousGlobal = process.env.GIT_CONFIG_GLOBAL; process.env.GIT_CONFIG_GLOBAL = hostileConfig;
    try {
      await rm(path.join(repository, "README.txt")); await rm(path.join(repository, "pointer.lfs")); await rm(path.join(repository, ".gitattributes")); await rm(path.join(repository, ".gitmodules"));
      await runIsolatedGitForTest(["-C", repository, "checkout", "--force", "--detach", "HEAD"], isolatedHome);
      expect(await readFile(path.join(repository, "README.txt"), "utf8")).toBe("fixture\n");
      expect(await readFile(path.join(repository, "pointer.lfs"), "utf8")).toContain("git-lfs.github.com/spec/v1");
      await expect(lstat(hookMarker)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(filterMarker)).rejects.toMatchObject({ code: "ENOENT" });
      await expect(lstat(path.join(repository, "vendor", "sub", ".git"))).rejects.toMatchObject({ code: "ENOENT" });
      await expect(runIsolatedGitForTest(["clone", "--", repository, path.join(root, "forbidden-clone")], isolatedHome, "download")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    } finally {
      if (previousGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL; else process.env.GIT_CONFIG_GLOBAL = previousGlobal;
    }
  });
});

describe("G04-G06 owned cleanup and resource faults", () => {
  it("terminates an active owned Git process on cancellation", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "nexus-cancel-git-")); roots.push(root);
    const controller = new AbortController();
    const running = runIsolatedGitForTest(["hash-object", "--stdin"], root, "verification", controller.signal);
    setTimeout(() => controller.abort(), 50);
    await expect(running).rejects.toMatchObject({ code: "CANCELLED" });
  });

  it("enforces materialized file and byte limits", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "nexus-limits-")); roots.push(root);
    await writeFile(path.join(root, "one"), "1234"); await writeFile(path.join(root, "two"), "5678");
    await expect(inspectPayload(root, 1, 100)).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    await expect(inspectPayload(root, 10, 7)).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
  });

  it("deletes only a stage whose exact ledger proves ownership", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "nexus-cleanup-")); roots.push(root);
    const owned = path.join(root, ".atlas-nexus-stage-owned"); const foreign = path.join(root, ".atlas-nexus-stage-foreign");
    await mkdir(owned); await mkdir(foreign);
    await writeFile(path.join(owned, ".atlas-nexus-owner.json"), JSON.stringify({ jobId: "owned" }));
    await writeFile(path.join(foreign, ".atlas-nexus-owner.json"), JSON.stringify({ jobId: "someone-else" }));
    await cleanupOwnedStage(owned, "owned"); await cleanupOwnedStage(foreign, "foreign");
    await expect(lstat(owned)).rejects.toMatchObject({ code: "ENOENT" });
    expect((await lstat(foreign)).isDirectory()).toBe(true);
  });
});

function trustedGit(args: string[]): string {
  const result = spawnSync("git", args, { shell: false, windowsHide: true, encoding: "utf8" });
  if (result.status !== 0) throw new CloneServiceError("INTERNAL_ERROR", `Fixture Git setup failed: ${result.stderr}`);
  return result.stdout;
}
