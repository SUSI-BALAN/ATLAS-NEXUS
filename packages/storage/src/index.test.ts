import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import { afterEach, describe, expect, it } from "vitest";
import { NexusDatabase } from "./index.js";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

describe("NexusDatabase", () => {
  it("migrates pre-multi-forge GitHub records without deleting history", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory); const file = path.join(directory, "nexus.sqlite");
    const require = createRequire(import.meta.url); const SQL = await initSqlJs({ locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm") }); const legacy = new SQL.Database();
    legacy.run("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL); INSERT INTO schema_migrations VALUES (1,'x'),(2,'x'),(3,'x');");
    legacy.run("CREATE TABLE clone_jobs(id TEXT PRIMARY KEY, source_url TEXT NOT NULL, mode TEXT NOT NULL, destination_path TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, phase TEXT NOT NULL DEFAULT 'Queued', progress_percent INTEGER, resolved_commit TEXT, verification_summary TEXT, error_code TEXT, error_message TEXT, retry_of_job_id TEXT, started_at TEXT, completed_at TEXT);");
    legacy.run("CREATE TABLE app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL); INSERT INTO app_settings VALUES ('theme','light','x'),('preferredFolderPath','D:\\Repos','x');");
    legacy.run("CREATE TABLE preferred_folders(id TEXT PRIMARY KEY,path TEXT NOT NULL,label TEXT NOT NULL,created_at TEXT NOT NULL,last_used_at TEXT NOT NULL); INSERT INTO preferred_folders VALUES ('folder','D:\\Repos','Repos','x','x');");
    const statuses = ["Completed", "Failed", "Cancelled", "Interrupted", "Partial"];
    for (const status of statuses) legacy.run("INSERT INTO clone_jobs(id,source_url,mode,destination_path,status,created_at,updated_at,phase,retry_of_job_id,resolved_commit,progress_percent) VALUES (?,?,?,?,?,?,?,?,?,?,?)", [status, "https://github.com/octocat/Hello-World.git", "full", `D:\\Repos\\${status}`, status, "created", "updated", status, status === "Completed" ? "Cancelled" : null, status === "Completed" ? "a".repeat(40) : null, status === "Completed" ? 100 : null]);
    await writeFile(file, legacy.export()); legacy.close();
    let db = await NexusDatabase.open(file);
    expect(db.schemaVersion()).toBe(4);
    for (const status of statuses) expect(db.getCloneJob(status)).toMatchObject({ sourceUrl: "https://github.com/octocat/Hello-World.git", provider: "github", namespace: "octocat", repositoryName: "Hello-World", status, createdAt: "created", updatedAt: "updated", destinationPath: `D:\\Repos\\${status}` });
    expect(db.getCloneJob("Completed")).toMatchObject({ retryOfJobId: "Cancelled", resolvedCommit: "a".repeat(40), progressPercent: 100 });
    expect(db.getSettings()).toEqual({ theme: "light", preferredFolderPath: "D:\\Repos" });
    const beforeRestart = db.listCloneJobs();
    await db.close(); db = await NexusDatabase.open(file);
    expect(db.listCloneJobs()).toEqual(beforeRestart);
    expect(db.getSettings()).toEqual({ theme: "light", preferredFolderPath: "D:\\Repos" });
    await db.close();
    const migrated = new SQL.Database(new Uint8Array(await readFile(file)));
    expect(migrated.exec("SELECT * FROM preferred_folders")[0]?.values).toEqual([["folder", "D:\\Repos", "Repos", "x", "x"]]);
    migrated.close();
  });

  it("does not persist a partial migration when legacy backfill fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory); const file = path.join(directory, "nexus.sqlite");
    const require = createRequire(import.meta.url); const SQL = await initSqlJs({ locateFile: () => require.resolve("sql.js/dist/sql-wasm.wasm") }); const legacy = new SQL.Database();
    legacy.run("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY,applied_at TEXT); INSERT INTO schema_migrations VALUES (3,'x'); CREATE TABLE clone_jobs(id TEXT,source_url TEXT); INSERT INTO clone_jobs VALUES ('old','https://github.com/a/b.git'); CREATE TRIGGER reject_backfill BEFORE UPDATE ON clone_jobs BEGIN SELECT RAISE(ABORT,'synthetic backfill failure'); END;");
    const originalBytes = legacy.export(); await writeFile(file, originalBytes); legacy.close();
    await expect(NexusDatabase.open(file)).rejects.toThrow("synthetic backfill failure");
    expect(new Uint8Array(await readFile(file))).toEqual(originalBytes);
  });

  it("migrates an empty database without fabricated repositories or jobs", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    expect(db.schemaVersion()).toBe(4);
    expect(db.tableIsEmpty("repositories")).toBe(true);
    expect(db.tableIsEmpty("clone_jobs")).toBe(true);
    await db.close();
  });

  it("persists clone lifecycle metadata and reconciles interrupted work", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const queued = await db.createCloneJob({ id: "11111111-1111-4111-8111-111111111111", sourceUrl: "https://github.com/octocat/Hello-World.git", provider: "github", namespace: "octocat", repositoryName: "Hello-World", mode: "snapshot", destinationPath: "D:\\Repos\\Hello-World" });
    expect(queued.status).toBe("Queued");
    await db.updateCloneJob(queued.id, { status: "Validating", phase: "Validating", startedAt: "2026-10-14T00:00:00.000Z" });
    await db.updateCloneJob(queued.id, { status: "Downloading", phase: "Downloading", progressPercent: 25 });
    expect((await db.reconcileInterruptedCloneJobs())).toBe(1);
    const restored = db.getCloneJob(queued.id);
    expect(restored).toMatchObject({ status: "Interrupted", phase: "Interrupted", progressPercent: null, errorCode: "INTERRUPTED" });
    await db.close();
  });

  it("rejects illegal clone state transitions", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const job = await db.createCloneJob({ id: "22222222-2222-4222-8222-222222222222", sourceUrl: "https://github.com/octocat/Hello-World.git", provider: "github", namespace: "octocat", repositoryName: "Hello-World", mode: "full", destinationPath: "D:\\Repos\\full" });
    await expect(db.updateCloneJob(job.id, { status: "Completed" })).rejects.toThrow("Illegal clone job transition");
    expect(db.getCloneJob(job.id)?.status).toBe("Queued");
    await db.close();
  });

  it("normalizes terminal progress so only Completed can show 100 percent", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory);
    const db = await NexusDatabase.open(path.join(directory, "nexus.sqlite"));
    const job = await db.createCloneJob({ id: "33333333-3333-4333-8333-333333333333", sourceUrl: "https://github.com/octocat/Hello-World.git", provider: "github", namespace: "octocat", repositoryName: "Hello-World", mode: "snapshot", destinationPath: "D:\\Repos\\failed" });
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

  it("preserves nested GitLab provenance and retry lineage after restart", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "nexus-db-")); directories.push(directory); const file = path.join(directory, "nexus.sqlite");
    let db = await NexusDatabase.open(file);
    const input = { id: "gitlab", sourceUrl: "https://gitlab.com/group/subgroup/repo.git", provider: "gitlab" as const, namespace: "group/subgroup", repositoryName: "repo", mode: "mirror" as const, destinationPath: "D:\\Repos\\gitlab", retryOfJobId: "failed" };
    const created = await db.createCloneJob(input); await db.close(); db = await NexusDatabase.open(file);
    expect(db.getCloneJob(input.id)).toEqual(created);
    await db.close();
  });
});
