import { useEffect, useMemo, useState, type JSX } from "react";
import { AlertTriangle, CheckCircle2, FolderOpen, GitBranch } from "lucide-react";
import type { CloneMode, DestinationPreview, FolderGrant } from "@atlas-nexus/types";
import { parseGitHubUrl } from "@atlas-nexus/validation";
import type { PageId } from "../App";

export function ClonePage({ folder, setFolder, navigate }: { folder: FolderGrant | null; setFolder: (folder: FolderGrant | null) => void; navigate: (page: PageId) => void }): JSX.Element {
  const [url, setUrl] = useState(""); const [mode, setMode] = useState<CloneMode>("snapshot");
  const [childName, setChildName] = useState(""); const [nameEdited, setNameEdited] = useState(false);
  const [preview, setPreview] = useState<DestinationPreview | null>(null); const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const validation = useMemo(() => { if (!url) return null; try { return { ok: true as const, data: parseGitHubUrl(url) }; } catch (cause) { return { ok: false as const, message: (cause as Error).message }; } }, [url]);

  useEffect(() => { if (validation?.ok && !nameEdited) setChildName(validation.data.repository); }, [validation, nameEdited]);
  useEffect(() => {
    setConfirmed(false); setPreview(null); if (!folder || !childName) return;
    let active = true; const timer = setTimeout(() => { void window.nexus.previewDestination({ grantId: folder.id, childName }).then(result => { if (active) { if (result.ok) setPreview(result.data); else setError(result.error.message); } }); }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [folder, childName]);

  const browse = async (): Promise<void> => { const result = await window.nexus.selectParentFolder(); if (result.ok && result.data) { setFolder(result.data); setError(null); } else if (!result.ok) setError(result.error.message); };
  const start = async (): Promise<void> => {
    if (!validation?.ok || !folder || !preview?.valid || !confirmed) return;
    setBusy(true); setError(null);
    const result = await window.nexus.startClone({ sourceUrl: validation.data.normalizedUrl, mode, grantId: folder.id, childName, confirmed: true });
    setBusy(false); if (result.ok) navigate("manager"); else { setConfirmed(false); setError(result.error.message); }
  };
  const ready = Boolean(validation?.ok && folder && preview?.valid && confirmed && !busy);

  return <div className="page stack-lg"><section className="intro"><span className="eyebrow">Secure repository download</span><h2>Review every destination before GitHub is contacted</h2><p>Atlas Nexus downloads only public GitHub HTTPS repositories after explicit confirmation. It never runs cloned code or installs dependencies.</p></section>
    <div className="clone-grid"><section className="panel form-panel"><div className="field-group"><label htmlFor="repository-url">GitHub repository URL</label><div className="input-with-icon"><GitBranch/><input id="repository-url" type="url" spellCheck={false} value={url} placeholder="https://github.com/owner/repository.git" onChange={event => { setUrl(event.target.value); setConfirmed(false); }}/></div>{validation && <div className={validation.ok ? "validation valid" : "validation invalid"}>{validation.ok ? <><CheckCircle2/>Valid public GitHub HTTPS URL</> : <><AlertTriangle/>{validation.message}</>}</div>}</div>
      <fieldset><legend>Download mode</legend><div className="mode-grid">{([['snapshot','Source snapshot','One resolved commit without final Git metadata.'],['full','Full Git clone','Working tree and normally fetched history.'],['mirror','Mirror archive','Bare refs and objects; no working tree.']] as const).map(item => <label key={item[0]} className={mode === item[0] ? "mode-card selected" : "mode-card"}><input type="radio" name="clone-mode" value={item[0]} checked={mode === item[0]} onChange={() => { setMode(item[0]); setConfirmed(false); }}/><strong>{item[1]}</strong><span>{item[2]}</span></label>)}</div></fieldset>
      <div className="field-group"><label>Destination parent</label><div className="path-picker"><div className="path-display"><FolderOpen size={18}/><span>{folder?.path ?? "No destination selected"}</span></div><button className="secondary" onClick={browse}>Browse</button><button className="ghost" onClick={() => navigate("folders")}>Manage folders</button></div></div>
      <div className="field-group"><label htmlFor="child-folder">New child folder</label><input id="child-folder" value={childName} maxLength={120} onChange={event => { setNameEdited(true); setChildName(event.target.value); }}/>{preview && <div className={preview.valid ? "validation valid" : "validation invalid"}>{preview.valid ? <CheckCircle2/> : <AlertTriangle/>}{preview.message}</div>}</div></section>
      <aside className="panel summary"><span className="eyebrow">Operation summary</span><dl><div><dt>Provider</dt><dd>{validation?.ok ? "GitHub" : "—"}</dd></div><div><dt>Repository</dt><dd>{validation?.ok ? `${validation.data.owner}/${validation.data.repository}` : "—"}</dd></div><div><dt>Mode</dt><dd>{mode}</dd></div><div><dt>Destination</dt><dd>{preview?.destinationPath ?? "—"}</dd></div></dl>
        <div className="stage-notice"><AlertTriangle/><div><strong>Bounded and isolated</strong><p>15-minute, 50,000-file, 2 GiB limits. Hooks, credential helpers, filters, LFS smudge, and submodule recursion are disabled.</p></div></div>
        <label className="confirmation"><input type="checkbox" checked={confirmed} disabled={!validation?.ok || !preview?.valid} onChange={event => setConfirmed(event.target.checked)}/><span>I reviewed the source, mode, and exact destination. Start the network download.</span></label>
        {error && <div className="inline-message error" role="alert"><AlertTriangle/>{error}</div>}
        <button className="primary full" disabled={!ready} onClick={start}>{busy ? "Starting…" : "Start clone"}</button></aside></div>
  </div>;
}
