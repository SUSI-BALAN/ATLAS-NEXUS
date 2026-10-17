import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NexusDatabase } from "@atlas-nexus/storage";
import type { CloneJob, CloneMode } from "@atlas-nexus/types";
import { CloneService, CloneServiceError } from "./cloneService.js";
import { FolderService } from "./folderService.js";

type DownloadOverride = (jobId: string, mode: CloneMode, sourceUrl: string, payload: string, isolatedHome: string, signal: AbortSignal) => Promise<string>;
type VerifyOverride = (jobId: string, mode: CloneMode, payload: string, isolatedHome: string, signal: AbortSignal) => Promise<string>;

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("clone lifecycle integration", () => {
  it("cancels an active job without publishing and preserves its terminal state", async () => {
    const context = await fixture();
    let entered!: () => void; const downloading = new Promise<void>(resolve => { entered = resolve; });
    overrideDownload(context.service, async (_jobId, _mode, _sourceUrl, payload, _home, signal) => {
      await mkdir(payload); entered();
      await new Promise<void>((_resolve, reject) => signal.addEventListener("abort", () => reject(new CloneServiceError("CANCELLED", "Cancelled by the owner.")), { once: true }));
      return "a".repeat(40);
    });
    const job = await context.service.start(input(context.grant.id, "cancelled")); await downloading;
    expect((await context.service.cancel(job.id)).status).toBe("Cancelled");
    await waitForTerminal(context.service, job.id);
    expect(context.database.getCloneJob(job.id)).toMatchObject({ status: "Cancelled", progressPercent: null, errorCode: "CANCELLED" });
    await expect(lstat(path.join(context.root, "cancelled"))).rejects.toMatchObject({ code: "ENOENT" });
    await context.database.close();
  });

  it("requires an explicit retry and preserves the failed predecessor", async () => {
    const context = await fixture();
    overrideDownload(context.service, async () => { throw new CloneServiceError("GIT_FAILED", "Git could not complete the requested repository operation."); });
    const failed = await context.service.start(input(context.grant.id, "retry-target"));
    expect(await waitForTerminal(context.service, failed.id)).toMatchObject({ status: "Failed", errorCode: "GIT_FAILED" });
    overrideDownload(context.service, successfulDownload);
    overrideVerify(context.service, async () => "Synthetic working copy verified.");
    const retried = await context.service.retry(failed.id, context.grant.id, "retry-target");
    expect(await waitForTerminal(context.service, retried.id)).toMatchObject({ status: "Completed", retryOfJobId: failed.id });
    expect(context.database.getCloneJob(failed.id)).toMatchObject({ status: "Failed", retryOfJobId: null });
    await context.database.close();
  });

  it("preserves a foreign destination created before publication", async () => {
    const context = await fixture(); const destination = path.join(context.root, "collision"); const marker = path.join(destination, "owner-marker.txt");
    overrideDownload(context.service, successfulDownload);
    overrideVerify(context.service, async () => { await mkdir(destination); await writeFile(marker, "foreign owner data"); return "Synthetic working copy verified."; });
    const job = await context.service.start(input(context.grant.id, "collision"));
    expect(await waitForTerminal(context.service, job.id)).toMatchObject({ status: "Failed", errorCode: "PATH_COLLISION" });
    expect(await readFile(marker, "utf8")).toBe("foreign owner data");
    await context.database.close();
  });

  it("records an active job as Interrupted on shutdown and persists it after restart", async () => {
    const context = await fixture();
    let entered!: () => void; const downloading = new Promise<void>(resolve => { entered = resolve; });
    overrideDownload(context.service, async (_jobId, _mode, _sourceUrl, payload, _home, signal) => {
      await mkdir(payload); entered();
      await new Promise<void>((_resolve, reject) => signal.addEventListener("abort", () => reject(new CloneServiceError("CANCELLED", "Cancelled by the owner.")), { once: true }));
      return "a".repeat(40);
    });
    const job = await context.service.start(input(context.grant.id, "interrupted")); await downloading; await context.service.shutdown();
    expect(context.database.getCloneJob(job.id)).toMatchObject({ status: "Interrupted", progressPercent: null, errorCode: "INTERRUPTED" });
    await context.database.close();
    const reopened = await NexusDatabase.open(context.databasePath);
    expect(reopened.getCloneJob(job.id)).toMatchObject({ status: "Interrupted", errorCode: "INTERRUPTED" });
    await reopened.close();
  });
});

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "atlas-nexus-lifecycle-")); roots.push(root);
  const databasePath = path.join(root, "jobs.sqlite"); const database = await NexusDatabase.open(databasePath);
  const folders = new FolderService(); const grant = await folders.grant(root); const service = new CloneService(database, folders);
  return { root, databasePath, database, folders, grant, service };
}

function input(grantId: string, childName: string) { return { sourceUrl: "https://github.com/octocat/Hello-World.git", mode: "full" as const, grantId, childName }; }
async function successfulDownload(_jobId: string, _mode: CloneMode, _sourceUrl: string, payload: string): Promise<string> { await mkdir(payload); await mkdir(path.join(payload, ".git")); await writeFile(path.join(payload, "README.md"), "fixture"); return "a".repeat(40); }
function overrideDownload(service: CloneService, implementation: DownloadOverride): void { (service as unknown as { download: DownloadOverride }).download = implementation; }
function overrideVerify(service: CloneService, implementation: VerifyOverride): void { (service as unknown as { verify: VerifyOverride }).verify = implementation; }
async function waitForTerminal(service: CloneService, id: string): Promise<CloneJob> { for (let attempt = 0; attempt < 200; attempt += 1) { const job = service.get(id); if (["Completed", "Partial", "Failed", "Cancelled", "Interrupted"].includes(job.status)) return job; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error("Timed out waiting for terminal state."); }
