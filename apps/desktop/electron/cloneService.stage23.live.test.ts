import { createHash } from "node:crypto";
import { lstat, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { NexusDatabase } from "@atlas-nexus/storage";
import type { CloneJob, CloneMode } from "@atlas-nexus/types";
import { CloneService } from "./cloneService.js";
import { FolderService } from "./folderService.js";

const live = process.env.ATLAS_NEXUS_LIVE_STAGE23 === "1" ? describe : describe.skip;
const roots: string[] = [];
afterAll(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });

live("Stage 2.3 final public-source regressions", () => {
  it.each<{ label: string; sourceUrl: string; mode: CloneMode }>([
    { label: "gitlab-full", sourceUrl: "https://gitlab.com/antora/antora-collector.git", mode: "full" },
    { label: "gitea-snapshot", sourceUrl: "https://gitea.com/SnapperGee/climax-prompt-python.git", mode: "snapshot" },
    { label: "forgejo-dotfiles-full", sourceUrl: "https://v15.next.forgejo.org/regulad/dotfiles.git", mode: "full" },
  ])("completes $label through CloneService", async ({ label, sourceUrl, mode }) => {
    const { root, database, folders, service } = await fixture();
    const grant = await folders.grant(root);
    const started = await service.start({ sourceUrl, mode, grantId: grant.id, childName: label });
    const finished = await waitForTerminal(service, started.id);
    expect(finished.status, JSON.stringify(finished)).toBe("Completed");
    expect(finished.resolvedCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(finished.verificationSummary).toBeTruthy();
    const destination = path.join(root, label);
    expect((await lstat(destination)).isDirectory()).toBe(true);
    if (mode === "snapshot") {
      await expect(lstat(path.join(destination, ".git"))).rejects.toMatchObject({ code: "ENOENT" });
      if (label === "gitea-snapshot") await verifySnapshotBlobs(destination, `https://gitea.com/api/v1/repos/SnapperGee/climax-prompt-python/git/trees/${finished.resolvedCommit}?recursive=true&per_page=1000`);
    }
    else expect((await lstat(path.join(destination, ".git"))).isDirectory()).toBe(true);
    if (process.env.ATLAS_NEXUS_RECORD_EVIDENCE === "1") process.stdout.write(`STAGE23_EVIDENCE ${JSON.stringify({ label, sourceUrl, mode, jobId: finished.id, destination, resolvedCommit: finished.resolvedCommit, verificationSummary: finished.verificationSummary, completedAt: finished.completedAt, scope: "isolated automated CloneService live test" })}\n`);
    await database.close();
  }, 180_000);

  it("does not misclassify the large Jake/dusk tree as diagnostic output", async () => {
    const { root, database, folders, service } = await fixture();
    const grant = await folders.grant(root);
    const started = await service.start({ sourceUrl: "https://v15.next.forgejo.org/Jake/dusk.git", mode: "snapshot", grantId: grant.id, childName: "forgejo-dusk-snapshot" });
    const finished = await waitForTerminal(service, started.id);
    expect(finished.errorCode).not.toBe("DIAGNOSTIC_LIMIT");
    expect(finished.errorMessage ?? "").not.toContain("diagnostic output");
    await database.close();
  }, 180_000);
});

async function fixture(): Promise<{ root: string; database: NexusDatabase; folders: FolderService; service: CloneService }> {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-nexus-stage23-live-")); roots.push(root);
  const database = await NexusDatabase.open(path.join(root, "jobs.sqlite"));
  const folders = new FolderService();
  const service = new CloneService(database, folders);
  return { root, database, folders, service };
}

async function waitForTerminal(service: CloneService, id: string): Promise<CloneJob> {
  const terminal = new Set(["Completed", "Partial", "Failed", "Cancelled", "Interrupted"]);
  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const job = service.get(id); if (terminal.has(job.status)) return job;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the live clone job.");
}

async function verifySnapshotBlobs(root: string, apiUrl: string): Promise<void> {
  const response = await fetch(apiUrl, { headers: { accept: "application/json", "user-agent": "Atlas-Nexus-live-test" } });
  expect(response.ok).toBe(true);
  const result = await response.json() as { truncated?: boolean; tree?: Array<{ path: string; type: string; sha: string }> };
  expect(result.truncated).toBe(false);
  const blobs = (result.tree ?? []).filter(entry => entry.type === "blob");
  const local = await walk(root);
  expect(local.sort()).toEqual(blobs.map(entry => entry.path).sort());
  for (const blob of blobs) {
    const content = await readFile(path.join(root, ...blob.path.split("/")));
    const actual = createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");
    expect(actual, blob.path).toBe(blob.sha);
  }
}

async function walk(root: string, relative = "", output: string[] = []): Promise<string[]> {
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    const child = path.posix.join(relative.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) await walk(root, child, output); else if (entry.isFile()) output.push(child);
  }
  return output;
}
