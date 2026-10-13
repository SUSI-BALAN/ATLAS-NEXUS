import { join } from "node:path";
import { app, BrowserWindow, session, shell } from "electron";
import { NexusDatabase } from "@atlas-nexus/storage";
import { FolderService } from "./folderService.js";
import { registerIpc } from "./ipc.js";
import { secureWindowOptions } from "./windowPolicy.js";
import { startStartupDiagnostics } from "./startupDiagnostics.js";
import { installContentSecurityPolicy } from "./contentSecurityPolicy.js";
import { preloadPath } from "./runtimePaths.js";

let database: NexusDatabase | null = null;
const diagnostics = startStartupDiagnostics();
diagnostics.record("module-loaded", { electron: process.versions.electron, chrome: process.versions.chrome, platform: process.platform });

async function createWindow(): Promise<void> {
  diagnostics.record("window-creating");
  const window = new BrowserWindow(secureWindowOptions(preloadPath(import.meta.dirname)));
  diagnostics.record("window-created");
  window.webContents.on("did-fail-load", (_event, errorCode) => diagnostics.record("renderer-load-failed", { errorCode }));
  window.webContents.on("render-process-gone", (_event, details) => diagnostics.record("renderer-process-gone", { reason: details.reason, exitCode: details.exitCode }));
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://github.com/") || url.startsWith("https://docs.github.com/")) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", event => event.preventDefault());
  window.once("ready-to-show", () => window.show());

  const databasePath = join(app.getPath("userData"), "nexus.sqlite");
  diagnostics.record("database-opening");
  database = await NexusDatabase.open(databasePath);
  diagnostics.record("database-opened");
  const developmentUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined;
  registerIpc({ window, database, databasePath, folderService: new FolderService(), ...(developmentUrl ? { developmentUrl } : {}) });
  if (developmentUrl) await window.loadURL(developmentUrl); else await window.loadFile(join(import.meta.dirname, "../renderer/index.html"));
  diagnostics.record("renderer-loaded");
}

app.whenReady().then(async () => {
  diagnostics.record("app-ready");
  app.setAppUserModelId("com.atlasnexus.desktop");
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  installContentSecurityPolicy(session.defaultSession);
  try { await createWindow(); } catch (error) { diagnostics.record("startup-failed", { name: (error as Error).name }); console.error("Atlas Nexus failed to start", { errorName: (error as Error).name }); app.quit(); }
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) void createWindow(); });
});

app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("child-process-gone", (_event, details) => diagnostics.record("child-process-gone", { type: details.type, reason: details.reason, exitCode: details.exitCode }));
app.on("before-quit", event => {
  diagnostics.record("before-quit");
  if (!database) return;
  event.preventDefault(); const current = database; database = null;
  void current.close().finally(() => app.exit(0));
});
