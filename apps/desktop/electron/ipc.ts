import { randomUUID } from "node:crypto";
import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { dialog, ipcMain, shell } from "electron";
import { IPC_CHANNELS, type AppStatus, type ErrorCode, type Result } from "@atlas-nexus/types";
import { childNameInputSchema, grantInputSchema, openFolderInputSchema, settingsUpdateSchema } from "@atlas-nexus/validation";
import type { NexusDatabase } from "@atlas-nexus/storage";
import { FolderService, FolderServiceError } from "./folderService.js";
import { isTrustedIpcSender } from "./senderPolicy.js";

function success<T>(data: T, requestId: string): Result<T> { return { ok: true, data, requestId }; }
function failure<T>(code: ErrorCode, message: string, requestId: string): Result<T> { return { ok: false, error: { code, message, requestId } }; }

export function registerIpc(options: { window: BrowserWindow; database: NexusDatabase; databasePath: string; folderService: FolderService; developmentUrl?: string }): void {
  const { window, database, databasePath, folderService, developmentUrl } = options;
  const register = <T>(channel: string, handler: (event: IpcMainInvokeEvent, input: unknown, requestId: string) => Promise<Result<T>>) => {
    ipcMain.removeHandler(channel);
    ipcMain.handle(channel, async (event, input) => {
      const requestId = randomUUID();
      if (!isTrustedIpcSender(event, window.webContents.id, developmentUrl)) return failure("INVALID_INPUT", "The request did not come from the application window.", requestId);
      try { return await handler(event, input, requestId); } catch (error) {
        if (error instanceof FolderServiceError) return failure(error.code, error.message, requestId);
        if ((error as { name?: string }).name === "ZodError") return failure("INVALID_INPUT", "The request format is invalid.", requestId);
        console.error("Atlas Nexus IPC operation failed", { requestId, channel, errorName: (error as Error).name });
        return failure("INTERNAL_ERROR", "The operation could not be completed.", requestId);
      }
    });
  };

  register<AppStatus>(IPC_CHANNELS.appStatus, async (_event, _input, requestId) => success({ version: "0.1.0", platform: process.platform, databaseReady: true, databasePath, cloneEngineAvailable: false }, requestId));
  register(IPC_CHANNELS.settingsGet, async (_event, _input, requestId) => success(database.getSettings(), requestId));
  register(IPC_CHANNELS.settingsUpdate, async (_event, input, requestId) => {
    const parsed = settingsUpdateSchema.parse(input);
    if (parsed.theme) await database.setSetting("theme", parsed.theme);
    return success(database.getSettings(), requestId);
  });
  register(IPC_CHANNELS.folderSelect, async (_event, _input, requestId) => {
    const selected = await dialog.showOpenDialog(window, { title: "Choose a parent folder", properties: ["openDirectory", "createDirectory", "dontAddToRecent"] });
    if (selected.canceled || !selected.filePaths[0]) return success(null, requestId);
    return success(await folderService.grant(selected.filePaths[0]), requestId);
  });
  register(IPC_CHANNELS.folderRestore, async (_event, _input, requestId) => {
    const preferred = database.getSettings().preferredFolderPath;
    if (!preferred) return success(null, requestId);
    try { return success(await folderService.grant(preferred), requestId); } catch { return success(null, requestId); }
  });
  register(IPC_CHANNELS.folderInfo, async (_event, input, requestId) => { const parsed = grantInputSchema.parse(input); return success(await folderService.info(parsed.grantId), requestId); });
  register(IPC_CHANNELS.folderPreview, async (_event, input, requestId) => { const parsed = childNameInputSchema.parse(input); return success(await folderService.preview(parsed.grantId, parsed.childName), requestId); });
  register(IPC_CHANNELS.folderCreate, async (_event, input, requestId) => { const parsed = childNameInputSchema.parse(input); return success(await folderService.create(parsed.grantId, parsed.childName), requestId); });
  register(IPC_CHANNELS.folderSave, async (_event, input, requestId) => { const parsed = grantInputSchema.parse(input); const info = await folderService.info(parsed.grantId); return success(await database.setSetting("preferredFolderPath", info.path), requestId); });
  register(IPC_CHANNELS.folderOpen, async (_event, input, requestId) => {
    const parsed = openFolderInputSchema.parse(input); const target = await folderService.pathForOpen(parsed.grantId, parsed.childName);
    const shellError = await shell.openPath(target); if (shellError) return failure("PATH_UNAVAILABLE", "Windows Explorer could not open the folder.", requestId);
    return success(null, requestId);
  });
}
