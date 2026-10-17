import { useCallback, useEffect, useState, type JSX } from "react";
import { AlertTriangle, CheckCircle2, GitBranch, RefreshCw, Square } from "lucide-react";
import type { CloneJob, FolderGrant } from "@atlas-nexus/types";

export function CloneManager({ folder }: { folder: FolderGrant | null }): JSX.Element {
  const [jobs, setJobs] = useState<CloneJob[]>([]); const [error, setError] = useState<string | null>(null);
  const [retryReadyId, setRetryReadyId] = useState<string | null>(null);
  const refresh = useCallback(async (): Promise<void> => { const result = await window.nexus.listCloneJobs(); if (result.ok) { setJobs(result.data.jobs); setError(null); } else setError(result.error.message); }, []);
  useEffect(() => { void refresh(); const timer = setInterval(() => { void refresh(); }, 1000); return () => clearInterval(timer); }, [refresh]);
  const cancel = async (id: string): Promise<void> => { const result = await window.nexus.cancelClone({ jobId: id }); if (!result.ok) setError(result.error.message); await refresh(); };
  const retry = async (job: CloneJob): Promise<void> => {
    if (!folder) { setError("Select the original destination parent again before retrying."); return; }
    const childName = job.destinationPath.split(/[\\/]/).filter(Boolean).at(-1) ?? "repository";
    const result = await window.nexus.retryClone({ jobId: job.id, grantId: folder.id, childName, confirmed: true }); setRetryReadyId(null); if (!result.ok) setError(result.error.message); await refresh();
  };
  const openDestination = async (job: CloneJob): Promise<void> => { if (!folder) { setError("Select the destination parent again before opening this folder."); return; } const childName = job.destinationPath.split(/[\\/]/).filter(Boolean).at(-1) ?? ""; const result = await window.nexus.openFolder({ grantId: folder.id, childName }); if (!result.ok) setError(result.error.message); };
  return <div className="page stack-lg"><section className="intro"><span className="eyebrow">Durable operations</span><h2>Clone Manager</h2><p>Statuses are persisted in SQLite. Restarted active jobs become Interrupted and are never resumed automatically.</p></section>
    {error && <div className="inline-message error" role="alert"><AlertTriangle/>{error}</div>}
    {jobs.length === 0 ? <section className="panel placeholder"><GitBranch/><h2>No clone operations</h2><p>Start an explicitly confirmed download from Clone from URL.</p></section> : <section className="jobs-list" aria-label="Clone jobs">{jobs.map(job => { const progress = jobProgressPresentation(job); const active = progress.kind === "active"; const retryable = ["Failed", "Cancelled", "Interrupted", "Partial"].includes(job.status); return <article className="panel job-card" key={job.id}><div className="job-head"><div>{job.status === "Completed" ? <CheckCircle2 className="valid"/> : active ? <RefreshCw className="spin"/> : <AlertTriangle className="invalid"/>}<div><strong>{job.namespace}/{job.repositoryName}</strong><span>{job.provider} · {job.mode} · {job.status} · {job.phase}</span></div></div><div className="button-row">{active && <button className="secondary" onClick={() => cancel(job.id)}><Square size={14}/> Cancel</button>}{job.status === "Completed" && <button className="secondary" onClick={() => openDestination(job)}>Open destination</button>}{retryable && retryReadyId !== job.id && <button className="secondary" onClick={() => setRetryReadyId(job.id)}><RefreshCw size={14}/> Review retry</button>}{retryable && retryReadyId === job.id && <button className="primary" onClick={() => retry(job)}>Confirm retry</button>}</div></div>{progress.kind === "active" ? <div className="progress-track indeterminate" aria-label={progress.label}><span/></div> : progress.kind === "completed" ? <div className="progress-track completed" aria-label={progress.label}><span style={{ width: "100%" }}/></div> : <div className="progress-terminal" aria-label={progress.label}>{progress.label}</div>}<dl className="metadata"><div><dt>Job ID</dt><dd className="path-value">{job.id}</dd></div><div><dt>Destination</dt><dd className="path-value">{job.destinationPath}</dd></div>{job.resolvedCommit && <div><dt>Commit</dt><dd className="path-value">{job.resolvedCommit}</dd></div>}{job.verificationSummary && <div><dt>Verification</dt><dd>{job.verificationSummary}</dd></div>}{job.errorMessage && <div><dt>Error</dt><dd className="invalid">{job.errorMessage}</dd></div>}</dl></article>; })}</section>}
  </div>;
}

export function jobProgressPresentation(job: CloneJob): { kind: "active" | "completed" | "terminal"; label: string } {
  if (["Queued", "Validating", "Downloading", "Verifying"].includes(job.status)) return { kind: "active", label: `In progress: ${job.phase}` };
  if (job.status === "Completed") return { kind: "completed", label: "Completed and verified: 100%" };
  return { kind: "terminal", label: `${job.status}: not completed` };
}
