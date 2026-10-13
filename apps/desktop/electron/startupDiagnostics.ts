import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { app } from "electron";
import { sanitizeDiagnosticDetail } from "./diagnosticPolicy.js";

export interface StartupDiagnostics {
  enabled: boolean;
  logPath: string | null;
  record(phase: string, detail?: Record<string, unknown>): void;
}

export function startStartupDiagnostics(): StartupDiagnostics {
  if (process.env.ATLAS_NEXUS_DIAGNOSTICS !== "1") return { enabled: false, logPath: null, record: () => undefined };
  const requestedDirectory = process.env.ATLAS_NEXUS_DIAGNOSTICS_DIR;
  const directory = requestedDirectory && isAbsolute(requestedDirectory) ? requestedDirectory : app.getPath("logs");
  const logPath = join(directory, "startup-diagnostics.jsonl");
  try {
    mkdirSync(dirname(logPath), { recursive: true });
  } catch {
    return { enabled: false, logPath: null, record: () => undefined };
  }
  const record = (phase: string, detail: Record<string, unknown> = {}) => {
    const entry = { time: new Date().toISOString(), ...sanitizeDiagnosticDetail({ phase, ...detail }) };
    try { appendFileSync(logPath, JSON.stringify(entry) + "\n", { encoding: "utf8" }); } catch { /* Diagnostics must never prevent startup. */ }
  };
  return { enabled: true, logPath, record };
}
