import { lstat, mkdtemp, mkdir, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FolderService, FolderServiceError } from "./folderService.js";

const directories: string[] = [];
afterEach(async () => { for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true }); });

describe("FolderService", () => {
  it("previews and exclusively creates a child folder", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexus-folder-")); directories.push(parent);
    const service = new FolderService();
    const grant = await service.grant(parent);
    expect((await service.preview(grant.id, "GPT-Researcher")).valid).toBe(true);
    const created = await service.create(grant.id, "GPT-Researcher");
    expect(created.destinationPath).toBe(path.join(await fsRealPath(parent), "GPT-Researcher"));
    expect((await lstat(created.destinationPath)).isDirectory()).toBe(true);
    await expect(service.create(grant.id, "GPT-Researcher")).rejects.toMatchObject({ code: "PATH_COLLISION" });
  });

  it("rejects invalid names without creating anything", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexus-folder-")); directories.push(parent);
    const service = new FolderService(); const grant = await service.grant(parent);
    await expect(service.create(grant.id, "..\\escape")).rejects.toBeInstanceOf(FolderServiceError);
  });

  it("rejects unknown grants", async () => {
    const service = new FolderService();
    await expect(service.info("00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "GRANT_NOT_FOUND" });
  });

  it("protects an existing child directory", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexus-folder-")); directories.push(parent);
    await mkdir(path.join(parent, "existing"));
    const service = new FolderService(); const grant = await service.grant(parent);
    const preview = await service.preview(grant.id, "existing");
    expect(preview).toMatchObject({ exists: true, valid: false });
  });

  it("fails closed when another process creates the destination after preview", async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "nexus-folder-")); directories.push(parent);
    const service = new FolderService(); const grant = await service.grant(parent);
    const preview = await service.preview(grant.id, "race-target");
    await mkdir(preview.destinationPath);
    await expect(service.revalidateCloneDestination(grant.id, "race-target", preview.parentPath, preview.destinationPath)).rejects.toMatchObject({ code: "PATH_COLLISION" });
  });

  it("fails closed when an approved parent is substituted with a reparse point", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "nexus-folder-")); directories.push(root);
    const parent = path.join(root, "parent"); const moved = path.join(root, "moved"); const other = path.join(root, "other");
    await mkdir(parent); await mkdir(other);
    const service = new FolderService(); const grant = await service.grant(parent);
    await rename(parent, moved);
    try { await symlink(other, parent, process.platform === "win32" ? "junction" : "dir"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EPERM") return; throw error; }
    await expect(service.info(grant.id)).rejects.toMatchObject({ code: "UNSUPPORTED_PATH" });
  });
});

async function fsRealPath(value: string): Promise<string> { return (await import("node:fs/promises")).realpath(value); }
