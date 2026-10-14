import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NexusDatabase } from "./index.js";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

describe("NexusDatabase", () => {
  it("migrates an empty database without fabricated repositories or jobs", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    expect(db.schemaVersion()).toBe(3);
    expect(db.tableIsEmpty("repositories")).toBe(true);
    expect(db.tableIsEmpty("clone_jobs")).toBe(true);
    await db.close();
  });

  it("persists clone lifecycle metadata and reconciles interrupted work", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const queued = await db.createCloneJob({ id: "11111111-1111-4111-8111-111111111111", sourceUrl: "https://github.com/octocat/Hello-World.git", mode: "snapshot", destinationPath: "D:\\Repos\\Hello-World" });
    expect(queued.status).toBe("Queued");
    await db.updateCloneJob(queued.id, { status: "Validating", phase: "Validating", startedAt: "2026-10-14T00:00:00.000Z" });
    await db.updateCloneJob(queued.id, { status: "Downloading", phase: "Downloading", progressPercent: 25 });
    expect((await db.reconcileInterruptedCloneJobs())).toBe(1);
    const restored = db.getCloneJob(queued.id);
    expect(restored).toMatchObject({ status: "Interrupted", phase: "Interrupted", progressPercent: null, errorCode: "INTERNAL_ERROR" });
    await db.close();
  });

  it("rejects illegal clone state transitions", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const job = await db.createCloneJob({ id: "22222222-2222-4222-8222-222222222222", sourceUrl: "https://github.com/octocat/Hello-World.git", mode: "full", destinationPath: "D:\\Repos\\full" });
    await expect(db.updateCloneJob(job.id, { status: "Completed" })).rejects.toThrow("Illegal clone job transition");
    expect(db.getCloneJob(job.id)?.status).toBe("Queued");
    await db.close();
  });

  it("normalizes terminal progress so only Completed can show 100 percent", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const job = await db.createCloneJob({ id: "33333333-3333-4333-8333-333333333333", sourceUrl: "https://github.com/octocat/Hello-World.git", mode: "snapshot", destinationPath: "D:\\Repos\\failed" });
    await db.updateCloneJob(job.id, { status: "Validating" }); await db.updateCloneJob(job.id, { status: "Failed", progressPercent: 100 });
    expect(db.getCloneJob(job.id)).toMatchObject({ status: "Failed", progressPercent: null });
    await db.close();
  });

  it("persists settings after a database restart", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const file = path.join(directory, "nexus.sqlite");
    let db = await NexusDatabase.open(file);
    await db.setSetting("theme", "light");
    await db.setSetting("preferredFolderPath", "D:\\Projects");
    await db.close();
    db = await NexusDatabase.open(file);
    expect(db.getSettings()).toEqual({ theme: "light", preferredFolderPath: "D:\\Projects" });
    await db.close();
  });
});
