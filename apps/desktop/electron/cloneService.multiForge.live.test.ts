import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { NexusDatabase } from "@atlas-nexus/storage";
import type { CloneJob, CloneMode, GitProvider } from "@atlas-nexus/types";
import { CloneService } from "./cloneService.js";
import { FolderService } from "./folderService.js";

const live = process.env.ATLAS_NEXUS_LIVE_FORGES === "1" ? describe : describe.skip;
const roots: string[] = [];
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
  it.each(cases)("verifies $provider $mode semantics", async ({ provider, url, mode }) => {
    const root = await mkdtemp(path.join(tmpdir(), `atlas-nexus-${provider}-`)); roots.push(root);
    const database = await NexusDatabase.open(path.join(root, "jobs.sqlite"));
    const folders = new FolderService(); const grant = await folders.grant(root); const service = new CloneService(database, folders);
    const initial = await service.start({ sourceUrl: url, mode: mode as CloneMode, grantId: grant.id, childName: mode });
    const finished = await waitForTerminal(service, initial.id);
    expect(finished.status, finished.errorMessage ?? undefined).toBe("Completed");
    expect(finished).toMatchObject({ provider, progressPercent: 100 });
    expect(finished.resolvedCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(finished.verificationSummary).toBeTruthy();
    await database.close();
  }, 180_000);
});

async function waitForTerminal(service: CloneService, id: string): Promise<CloneJob> {
  const terminal = new Set(["Completed", "Partial", "Failed", "Cancelled", "Interrupted"]);
  for (let attempt = 0; attempt < 600; attempt += 1) {
    const job = service.get(id); if (terminal.has(job.status)) return job;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the live clone job.");
}
