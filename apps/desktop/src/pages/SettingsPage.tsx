import { Database, MonitorCog, ShieldCheck } from "lucide-react";
import type { JSX } from "react";
import type { AppSettings, AppStatus, ThemePreference } from "@atlas-nexus/types";

export function SettingsPage({ settings, status, saveTheme }: { settings: AppSettings; status: AppStatus | null; saveTheme: (theme: ThemePreference) => Promise<void> }): JSX.Element {
  return <div className="page stack-lg"><section className="intro"><span className="eyebrow">Local preferences</span><h2>Settings that stay on this device</h2><p>Atlas Nexus stores application preferences in its local SQLite database outside the installation directory.</p></section>
    <div className="settings-grid"><section className="panel"><div className="setting-heading"><MonitorCog/><div><h3>Appearance</h3><p>Choose a Midnight Aurora theme.</p></div></div><div className="segmented" role="group" aria-label="Theme preference">{(["system","dark","light"] as const).map(theme => <button key={theme} aria-pressed={settings.theme === theme} onClick={() => void saveTheme(theme)}>{theme[0]?.toUpperCase()}{theme.slice(1)}</button>)}</div></section>
      <section className="panel"><div className="setting-heading"><Database/><div><h3>Local database</h3><p>{status?.databaseReady ? "Initialized and ready" : "Checking startup status"}</p></div></div><dl className="metadata"><div><dt>Version</dt><dd>{status?.version ?? "—"}</dd></div><div><dt>Platform</dt><dd>{status?.platform ?? "—"}</dd></div><div><dt>Path</dt><dd className="path-value">{status?.databasePath ?? "—"}</dd></div></dl></section>
      <section className="panel"><div className="setting-heading"><ShieldCheck/><div><h3>Security defaults</h3><p>Renderer and clone protections</p></div></div><ul className="compact-list"><li>Context isolation and sandbox enabled</li><li>Node integration disabled</li><li>Allowlisted and validated IPC</li><li>No cloned-code execution or implicit dependency fetching</li></ul></section></div>
  </div>;
}
