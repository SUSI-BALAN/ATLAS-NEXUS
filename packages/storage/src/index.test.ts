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
    expect(db.schemaVersion()).toBe(1);
    expect(db.tableIsEmpty("repositories")).toBe(true);
    expect(db.tableIsEmpty("clone_jobs")).toBe(true);
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
