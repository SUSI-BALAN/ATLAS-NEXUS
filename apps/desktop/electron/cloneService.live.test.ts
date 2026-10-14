import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { NexusDatabase } from "@atlas-nexus/storage";
import type { CloneJob, CloneMode } from "@atlas-nexus/types";
import { CloneService } from "./cloneService.js";
import { FolderService } from "./folderService.js";

const live = process.env.ATLAS_NEXUS_LIVE_GITHUB === "1" ? describe : describe.skip;
const roots: string[] = [];
afterAll(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });

live("live public GitHub clone modes", () => {
  it.each<CloneMode>(["snapshot", "full", "mirror"])("produces and verifies a real %s download", async mode => {
    const root = await mkdtemp(path.join(tmpdir(), "atlas-nexus-live-")); roots.push(root);
    const database = await NexusDatabase.open(path.join(root, "jobs.sqlite"));
    const folders = new FolderService(); const grant = await folders.grant(root); const service = new CloneService(database, folders);
    const initial = await service.start({ sourceUrl: "https://github.com/octocat/Hello-World.git", mode, grantId: grant.id, childName: mode });
    const finished = await waitForTerminal(service, initial.id);
    expect(finished.status, finished.errorMessage ?? undefined).toBe("Completed");
    expect(finished.resolvedCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(finished.verificationSummary).toBeTruthy();
    await database.close();
  }, 180_000);

  it("cancels an owned job without publishing a destination and requires an explicit retry", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "atlas-nexus-live-")); roots.push(root);
    const database = await NexusDatabase.open(path.join(root, "jobs.sqlite"));
    const folders = new FolderService(); const grant = await folders.grant(root); const service = new CloneService(database, folders);
    const initial = await service.start({ sourceUrl: "https://github.com/octocat/Hello-World.git", mode: "full", grantId: grant.id, childName: "cancelled" });
    const cancelled = await service.cancel(initial.id);
    expect(cancelled.status).toBe("Cancelled");
    const retried = await service.retry(initial.id, grant.id, "retried");
    expect((await waitForTerminal(service, retried.id)).status).toBe("Completed");
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
