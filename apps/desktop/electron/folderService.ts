import { randomUUID } from "node:crypto";
import { access, lstat, mkdir, realpath, statfs } from "node:fs/promises";
import path from "node:path";
import type { DestinationPreview, FolderGrant } from "@atlas-nexus/types";
import { FolderNameError, resolveChildPath } from "@atlas-nexus/security";

export class FolderServiceError extends Error {
  constructor(readonly code: "INVALID_PARENT" | "GRANT_NOT_FOUND" | "PATH_UNAVAILABLE" | "PATH_COLLISION" | "PERMISSION_DENIED" | "UNSUPPORTED_PATH" | "INVALID_FOLDER_NAME", message: string) { super(message); }
}

export class FolderService {
  private readonly grants = new Map<string, string>();

  async grant(selectedPath: string): Promise<FolderGrant> {
    const canonical = await this.validateParent(selectedPath);
    const id = randomUUID();
    this.grants.set(id, canonical);
    return this.describe(id, canonical);
  }

  async info(grantId: string): Promise<FolderGrant> { const parent = await this.resolveGrant(grantId); return this.describe(grantId, parent); }

  async preview(grantId: string, childName: string): Promise<DestinationPreview> {
    const parent = await this.resolveGrant(grantId);
    const destination = this.child(parent, childName);
    let exists = false;
    try { await lstat(destination); exists = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw this.mapFsError(error); }
    return { parentPath: parent, childName, destinationPath: destination, exists, valid: !exists, message: exists ? "A file or folder already exists at this destination." : "Destination is available." };
  }

  async create(grantId: string, childName: string): Promise<DestinationPreview> {
    const parent = await this.resolveGrant(grantId);
    const destination = this.child(parent, childName);
    try { await mkdir(destination, { recursive: false }); } catch (error) { throw this.mapFsError(error); }
    const childStats = await lstat(destination);
    if (!childStats.isDirectory() || childStats.isSymbolicLink()) throw new FolderServiceError("UNSUPPORTED_PATH", "The created destination is not a regular directory.");
    return { parentPath: parent, childName, destinationPath: destination, exists: true, valid: true, message: "Folder created successfully." };
  }

  async pathForOpen(grantId: string, childName?: string): Promise<string> {
    const parent = await this.resolveGrant(grantId);
    const target = childName === undefined ? parent : this.child(parent, childName);
    const stats = await lstat(target).catch(error => { throw this.mapFsError(error); });
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new FolderServiceError("UNSUPPORTED_PATH", "Only regular directories can be opened.");
    return target;
  }

  async resolveCloneDestination(grantId: string, childName: string): Promise<{ parentPath: string; destinationPath: string }> {
    const parentPath = await this.resolveGrant(grantId);
    const destinationPath = this.child(parentPath, childName);
    try { await lstat(destinationPath); throw new FolderServiceError("PATH_COLLISION", "A file or folder already exists at this destination."); }
    catch (error) { if (error instanceof FolderServiceError) throw error; if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw this.mapFsError(error); }
    return { parentPath, destinationPath };
  }

  async revalidateCloneDestination(grantId: string, childName: string, expectedParent: string, expectedDestination: string): Promise<void> {
    const resolved = await this.resolveCloneDestination(grantId, childName);
    if (resolved.parentPath.toLowerCase() !== expectedParent.toLowerCase() || resolved.destinationPath.toLowerCase() !== expectedDestination.toLowerCase()) {
      throw new FolderServiceError("UNSUPPORTED_PATH", "The approved destination changed before publication.");
    }
  }

  private async resolveGrant(grantId: string): Promise<string> {
    const granted = this.grants.get(grantId);
    if (!granted) throw new FolderServiceError("GRANT_NOT_FOUND", "Select the parent folder again.");
    const current = await this.validateParent(granted);
    if (current.toLowerCase() !== granted.toLowerCase()) throw new FolderServiceError("UNSUPPORTED_PATH", "The selected folder changed after it was approved.");
    return current;
  }

  private async validateParent(input: string): Promise<string> {
    const resolved = path.resolve(input);
    if (resolved.startsWith("\\\\") || resolved.startsWith("\\\\?\\") || resolved.startsWith("\\\\.\\")) throw new FolderServiceError("UNSUPPORTED_PATH", "Network and device namespace paths are not supported yet.");
    let stats;
    try { stats = await lstat(resolved); await access(resolved); } catch (error) { throw this.mapFsError(error); }
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new FolderServiceError("UNSUPPORTED_PATH", "Select a regular local directory. Reparse-point folders are not supported yet.");
    return realpath(resolved);
  }

  private child(parent: string, childName: string): string {
    try { return resolveChildPath(parent, childName); } catch (error) {
      if (error instanceof FolderNameError) throw new FolderServiceError("INVALID_FOLDER_NAME", error.message);
      throw error;
    }
  }

  private async describe(id: string, folderPath: string): Promise<FolderGrant> {
    let availableBytes: number | null = null, totalBytes: number | null = null;
    try { const value = await statfs(folderPath, { bigint: true }); availableBytes = Number(value.bavail * value.bsize); totalBytes = Number(value.blocks * value.bsize); } catch { /* optional capacity metadata */ }
    return { id, path: folderPath, name: path.basename(folderPath) || folderPath, availableBytes, totalBytes };
  }

  private mapFsError(error: unknown): FolderServiceError {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return new FolderServiceError("PATH_COLLISION", "A file or folder already exists at this destination.");
    if (code === "EACCES" || code === "EPERM") return new FolderServiceError("PERMISSION_DENIED", "Windows denied access to this folder.");
    if (code === "ENOENT" || code === "ENODEV") return new FolderServiceError("PATH_UNAVAILABLE", "The selected folder or drive is no longer available.");
    return new FolderServiceError("INVALID_PARENT", "The folder operation could not be completed safely.");
  }
}
