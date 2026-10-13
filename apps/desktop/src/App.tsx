import { useEffect, useState, type JSX } from "react";
import type { AppSettings, AppStatus, FolderGrant, ThemePreference } from "@atlas-nexus/types";
import { ErrorBoundary } from "./ErrorBoundary";
import { icons } from "./icons";
import { Dashboard } from "./pages/Dashboard";
import { ClonePage } from "./pages/ClonePage";
import { FolderManager } from "./pages/FolderManager";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SettingsPage } from "./pages/SettingsPage";

export type PageId = "dashboard" | "clone" | "folders" | "vault" | "manager" | "inspector" | "ai" | "settings";
const navigation: { id: PageId; label: string; caption: string }[] = [
  { id: "dashboard", label: "Dashboard", caption: "Overview" },
  { id: "clone", label: "Clone from URL", caption: "Prepare a repository" },
  { id: "folders", label: "Folder Manager", caption: "Destinations" },
  { id: "vault", label: "My Vault", caption: "Local library" },
  { id: "manager", label: "Clone Manager", caption: "Operations" },
  { id: "inspector", label: "Source Inspector", caption: "Stage 4" },
  { id: "ai", label: "AI Research", caption: "Stage 5" },
  { id: "settings", label: "Settings", caption: "Preferences" }
];

export function App(): JSX.Element {
  const [page, setPage] = useState<PageId>("dashboard");
  const [settings, setSettings] = useState<AppSettings>({ theme: "system", preferredFolderPath: null });
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [folder, setFolder] = useState<FolderGrant | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([window.nexus.getSettings(), window.nexus.getAppStatus(), window.nexus.restorePreferredFolder()]).then(([settingsResult, statusResult, folderResult]) => {
      if (settingsResult.ok) setSettings(settingsResult.data); else setStartupError(settingsResult.error.message);
      if (statusResult.ok) setStatus(statusResult.data); else setStartupError(statusResult.error.message);
      if (folderResult.ok) setFolder(folderResult.data);
    }).catch(() => setStartupError("The application services are unavailable."));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.colorScheme = settings.theme === "system" ? "dark light" : settings.theme;
  }, [settings.theme]);

  const saveTheme = async (theme: ThemePreference): Promise<void> => {
    const result = await window.nexus.updateSettings({ theme });
    if (result.ok) setSettings(result.data); else setStartupError(result.error.message);
  };

  const content = (() => {
    if (page === "dashboard") return <Dashboard status={status} folder={folder} navigate={setPage} />;
    if (page === "clone") return <ClonePage folder={folder} setFolder={setFolder} navigate={setPage} />;
    if (page === "folders") return <FolderManager folder={folder} setFolder={setFolder} />;
    if (page === "settings") return <SettingsPage settings={settings} status={status} saveTheme={saveTheme} />;
    const definitions = {
      vault: ["My Vault", "Your repository library is empty", "Vault records and file manifests will be implemented in Stage 3."],
      manager: ["Clone Manager", "No clone operations", "The Git clone engine and durable job controls will be implemented in Stage 2."],
      inspector: ["Source Inspector", "Source analysis is not implemented", "Evidence-backed static inspection arrives in Stage 4. Atlas Nexus will not execute repository code."],
      ai: ["AI Research", "AI is disabled", "Optional local and cloud research modes arrive in Stage 5. Cloning will never depend on AI."]
    } as const;
    const definition = definitions[page as keyof typeof definitions];
    return <PlaceholderPage title={definition[0]} heading={definition[1]} detail={definition[2]} />;
  })();

  return <ErrorBoundary><div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">AN</div><div><strong>Atlas Nexus</strong><span>Local workspace</span></div></div>
      <nav aria-label="Primary navigation">{navigation.map(item => { const Icon = icons[item.id]!; return <button key={item.id} aria-current={page === item.id ? "page" : undefined} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => setPage(item.id)}><Icon size={19} aria-hidden="true"/><span><b>{item.label}</b><small>{item.caption}</small></span></button>; })}</nav>
      <div className="sidebar-foot"><span className="status-dot" aria-hidden="true"/><span>Stage 1 · Local only</span></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div><span className="eyebrow">Windows desktop foundation</span><h1>{navigation.find(item => item.id === page)?.label}</h1></div><div className="privacy-pill">No remote requests</div></header>
      {startupError && <div className="banner error" role="alert">{startupError}<button aria-label="Dismiss error" onClick={() => setStartupError(null)}>×</button></div>}
      <main id="main-content" tabIndex={-1}>{content}</main>
    </div>
  </div></ErrorBoundary>;
}
