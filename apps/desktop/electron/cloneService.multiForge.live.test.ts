import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NexusDatabase } from "@atlas-nexus/storage";
import type { CloneJob, GitProvider } from "@atlas-nexus/types";
import { CloneService, runIsolatedGitForTest } from "./cloneService.js";
import { FolderService } from "./folderService.js";

const live = process.env.ATLAS_NEXUS_LIVE_FORGES === "1" ? describe : describe.skip;
const roots: string[] = [];
const heads = new Map<GitProvider, string>();
const refs = new Map<GitProvider, string[]>();
const snapshots = new Map<GitProvider, Record<string, string>>();
afterAll(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });

const fixtures: ReadonlyArray<{ provider: GitProvider; url: string }> = [
  { provider: "github", url: "https://github.com/octocat/Hello-World.git" },
  { provider: "gitlab", url: "https://gitlab.com/gitlab-org/gitlab-test.git" },
  { provider: "codeberg", url: "https://codeberg.org/ciphel/01Hello_World.git" },
  { provider: "gitea", url: "https://gitea.com/apachenpub/accept-test.git" },
  { provider: "forgejo", url: "https://v15.next.forgejo.org/kavemand/.forgejo.git" }
];
const cases = fixtures.flatMap(fixture => (["snapshot", "full", "mirror"] as const).map(mode => ({ ...fixture, mode })));

live("live approved-forge clone matrix", () => {
  beforeAll(async () => {
    const root = await mkdtemp(path.join(tmpdir(), "atlas-nexus-forge-probes-")); roots.push(root);
    for (const fixture of fixtures) {
      const output = await runIsolatedGitForTest(["ls-remote", "--", fixture.url], root, "download");
      const head = /^([0-9a-f]{40})\s+HEAD$/m.exec(output)?.[1];
      expect(head, `${fixture.provider} read-only endpoint probe`).toBeTruthy(); heads.set(fixture.provider, head!);
      refs.set(fixture.provider, output.split(/\r?\n/).filter(line => /\srefs\//.test(line) && !line.endsWith("^{}")).map(line => line.replace(/\s+/, " ")).sort());
    }
  }, 180_000);

  it.each(cases)("verifies $provider $mode semantics", async ({ provider, url, mode }) => {
    const root = await mkdtemp(path.join(tmpdir(), `atlas-nexus-${provider}-`)); roots.push(root);
    const database = await NexusDatabase.open(path.join(root, "jobs.sqlite"));
    const folders = new FolderService(); const grant = await folders.grant(root); const service = new CloneService(database, folders);
    try {
      const initial = await service.start({ sourceUrl: url, mode, grantId: grant.id, childName: mode });
      const finished = await waitForTerminal(service, initial.id);
      expect(finished.status, finished.errorMessage ?? undefined).toBe("Completed");
      expect(finished).toMatchObject({ provider, sourceUrl: url, progressPercent: 100, resolvedCommit: heads.get(provider), destinationPath: path.join(root, mode) });
      expect(finished.verificationSummary).toBeTruthy();
      const destination = path.join(root, mode);
      expect((await lstat(destination)).isDirectory()).toBe(true);
      if (mode === "snapshot") {
        await expect(lstat(path.join(destination, ".git"))).rejects.toMatchObject({ code: "ENOENT" });
        const hashes = await sourceHashes(destination); expect(Object.keys(hashes).length).toBeGreaterThan(0); snapshots.set(provider, hashes);
      } else {
        expect((await runIsolatedGitForTest(["-C", destination, "rev-parse", "HEAD"], root)).trim()).toBe(finished.resolvedCommit);
        expect((await runIsolatedGitForTest(["-C", destination, "rev-parse", "--is-bare-repository"], root)).trim()).toBe(mode === "mirror" ? "true" : "false");
        if (mode === "full") {
          expect((await lstat(path.join(destination, ".git"))).isDirectory()).toBe(true);
          expect((await runIsolatedGitForTest(["-C", destination, "rev-parse", "--is-shallow-repository"], root)).trim()).toBe("false");
          expect(await sourceHashes(destination)).toEqual(snapshots.get(provider));
        } else {
          await expect(lstat(path.join(destination, ".git"))).rejects.toMatchObject({ code: "ENOENT" });
          expect((await runIsolatedGitForTest(["-C", destination, "config", "--get", "remote.origin.mirror"], root)).trim()).toBe("true");
          const actualRefs = (await runIsolatedGitForTest(["-C", destination, "for-each-ref", "--format=%(objectname) %(refname)"], root)).trim().split(/\r?\n/).sort();
          expect(actualRefs).toEqual(refs.get(provider));
        }
      }
      console.info(`FORGE_EVIDENCE ${JSON.stringify({ provider, mode, commit: finished.resolvedCommit, structureVerified: true })}`);
    } finally { await service.shutdown(); await database.close(); }
  }, 180_000);
});

async function sourceHashes(root: string, prefix = ""): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    if (!prefix && entry.name === ".git") continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(hashes, await sourceHashes(root, relative));
    else if (entry.isFile()) hashes[relative] = createHash("sha256").update(await readFile(path.join(root, relative))).digest("hex");
    else throw new Error("The published fixture contains an unsupported filesystem entry.");
  }
  return hashes;
}

async function waitForTerminal(service: CloneService, id: string): Promise<CloneJob> {
  const terminal = new Set(["Completed", "Partial", "Failed", "Cancelled", "Interrupted"]);
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const job = service.get(id); if (terminal.has(job.status)) return job;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the live clone job.");
}
