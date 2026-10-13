const { appendFileSync } = require("node:fs");
const { app, BrowserWindow } = require("electron");

const logPath = process.env.ATLAS_NEXUS_DIAGNOSTIC_LOG;
function record(phase, detail = {}) {
  if (!logPath) return;
  appendFileSync(logPath, JSON.stringify({ time: new Date().toISOString(), phase, ...detail }) + "\n");
}

record("module-loaded", { electron: process.versions.electron, chrome: process.versions.chrome });
process.on("uncaughtException", error => record("uncaught-exception", { name: error.name }));
process.on("unhandledRejection", reason => record("unhandled-rejection", { type: typeof reason }));
app.on("child-process-gone", (_event, details) => record("child-process-gone", { type: details.type, reason: details.reason, exitCode: details.exitCode }));
app.on("render-process-gone", (_event, _contents, details) => record("render-process-gone", { reason: details.reason, exitCode: details.exitCode }));

app.whenReady().then(async () => {
  record("ready");
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  record("window-created");
  await window.loadURL("data:text/html,<main>Atlas Nexus Electron smoke test</main>");
  record("renderer-loaded");
  window.destroy();
  app.quit();
}).catch(error => {
  record("startup-failed", { name: error.name });
  app.exit(1);
});
