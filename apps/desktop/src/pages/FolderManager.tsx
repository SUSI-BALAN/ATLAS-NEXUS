import { useEffect, useState, type JSX } from "react";
import { FolderOpen, HardDrive, Save, ShieldCheck } from "lucide-react";
import type { DestinationPreview, FolderGrant } from "@atlas-nexus/types";

export function FolderManager({ folder, setFolder }: { folder: FolderGrant | null; setFolder: (folder: FolderGrant | null) => void }): JSX.Element {
  const [name, setName] = useState("");
  const [preview, setPreview] = useState<DestinationPreview | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPreview(null); setMessage(null);
    if (!folder || !name) return;
    const timer = window.setTimeout(() => { void window.nexus.previewDestination({ grantId: folder.id, childName: name }).then(result => result.ok ? setPreview(result.data) : setMessage({ kind: "error", text: result.error.message })); }, 180);
    return () => clearTimeout(timer);
  }, [folder, name]);

  const browse = async (): Promise<void> => {
    setBusy(true); setMessage(null);
    const result = await window.nexus.selectParentFolder(); setBusy(false);
    if (!result.ok) return setMessage({ kind: "error", text: result.error.message });
    if (result.data) { setFolder(result.data); setPreview(null); setMessage({ kind: "success", text: "Parent folder selected. No files were changed." }); }
  };
  const create = async (): Promise<void> => {
    if (!folder) return; setBusy(true); setMessage(null);
    const result = await window.nexus.createChildFolder({ grantId: folder.id, childName: name }); setBusy(false);
    if (result.ok) { setPreview(result.data); setMessage({ kind: "success", text: result.data.message }); } else setMessage({ kind: "error", text: result.error.message });
  };
  const save = async (): Promise<void> => {
    if (!folder) return; const result = await window.nexus.savePreferredFolder({ grantId: folder.id });
    setMessage(result.ok ? { kind: "success", text: "Preferred destination saved for the next restart." } : { kind: "error", text: result.error.message });
  };
  const open = async (): Promise<void> => {
    if (!folder) return; const result = await window.nexus.openFolder({ grantId: folder.id, ...(preview?.exists && preview.valid ? { childName: name } : {}) });
    if (!result.ok) setMessage({ kind: "error", text: result.error.message });
  };

  return <div className="page stack-lg"><section className="intro"><span className="eyebrow">Controlled filesystem access</span><h2>Choose where projects will live</h2><p>Atlas Nexus receives access only after you select a local parent folder. New children are created exclusively and existing data is never replaced.</p></section>
    <section className="folder-layout"><div className="panel form-panel"><div className="field-group"><label>Parent folder</label><div className="path-picker"><div className="path-display"><HardDrive size={18}/><span>{folder?.path ?? "No folder selected"}</span></div><button className="secondary" disabled={busy} onClick={browse}><FolderOpen size={17}/>{folder ? "Change" : "Browse"}</button></div>{folder && <div className="storage-line"><span>{formatBytes(folder.availableBytes)} available</span><span>{formatBytes(folder.totalBytes)} total</span></div>}</div>
      <div className="field-group"><label htmlFor="folder-name">New child folder</label><input id="folder-name" value={name} maxLength={120} placeholder="GPT-Researcher" onChange={event => { setName(event.target.value); setMessage(null); }}/><small>One Windows folder name. Paths, reserved device names, and traversal are rejected.</small></div>
      <div className="destination-box"><span>Destination preview</span><strong>{preview?.destinationPath ?? (folder ? `${folder.path}\\${name || "New folder"}` : "Select a parent folder first")}</strong><small className={preview?.valid ? "valid" : preview ? "invalid" : ""}>{preview?.message ?? "Preview does not create or modify files."}</small></div>
      {message && <div role="status" className={`inline-message ${message.kind}`}>{message.kind === "success" && <ShieldCheck size={17}/>}<span>{message.text}</span></div>}
      <div className="button-row"><button className="primary" disabled={!folder || !name || busy || preview?.valid !== true} onClick={create}>Create folder</button><button className="secondary" disabled={!folder} onClick={save}><Save size={17}/>Save preferred</button><button className="ghost" disabled={!folder} onClick={open}>Open in Explorer</button></div></div>
      <aside className="panel guardrail"><ShieldCheck className="large-icon"/><h3>Folder safety</h3><ul><li>Opaque grants limit renderer requests</li><li>Parent folders are revalidated before each operation</li><li>Junctions and symbolic links are rejected</li><li>Creation fails if the destination already exists</li><li>No recursive delete or overwrite operation exists</li></ul></aside></section>
  </div>;
}

function formatBytes(value: number | null): string { if (value === null) return "Storage unknown"; const units = ["B", "KB", "MB", "GB", "TB"]; let size = value, unit = 0; while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; } return `${size.toFixed(unit > 2 ? 1 : 0)} ${units[unit]}`; }
