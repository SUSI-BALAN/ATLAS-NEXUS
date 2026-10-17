import { ArrowRight, CheckCircle2, Folder, GitBranch, ShieldCheck } from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import type { AppStatus, CloneJobSummary, FolderGrant } from "@atlas-nexus/types";
import { SUPPORTED_GIT_PROVIDERS } from "@atlas-nexus/validation";
import type { PageId } from "../App";

export function Dashboard({ status, folder, navigate }: { status: AppStatus | null; folder: FolderGrant | null; navigate: (page: PageId) => void }): JSX.Element {
  const [jobs, setJobs] = useState<CloneJobSummary | null>(null);
  useEffect(() => { void window.nexus.listCloneJobs().then(result => { if (result.ok) setJobs(result.data); }); }, []);
  const completed = jobs?.counts.Completed ?? 0; const active = (jobs?.counts.Queued ?? 0) + (jobs?.counts.Validating ?? 0) + (jobs?.counts.Downloading ?? 0) + (jobs?.counts.Verifying ?? 0);
  const providerCount = new Set(jobs?.jobs.map(job => job.provider) ?? []).size;
  const providerActivity = SUPPORTED_GIT_PROVIDERS.map(provider => `${provider.label}: ${jobs?.jobs.filter(job => job.provider === provider.id).length ?? 0}`).join(" · ");
  return <div className="page stack-xl">
    <section className="hero-card"><div><span className="eyebrow">Your source workspace</span><h2>Download public source with a verified destination.</h2><p>Choose a local folder, review the exact operation, then explicitly start a bounded provider download.</p><div className="button-row"><button className="primary" onClick={() => navigate("clone")}>Clone from URL <ArrowRight size={17}/></button><button className="secondary" onClick={() => navigate("manager")}>View operations</button></div></div><div className="orbit" aria-hidden="true"><div className="orbit-core">AN</div><span/><span/><span/></div></section>
    <section className="stats-grid" aria-label="Application status">
      <article className="stat-card"><div className="icon-box cyan"><Folder/></div><div><span>Preferred destination</span><strong>{folder ? folder.name : "Not selected"}</strong><small>{folder?.path ?? "Choose a local parent folder"}</small></div></article>
      <article className="stat-card"><div className="icon-box violet"><GitBranch/></div><div><span>Clone jobs</span><strong>{completed} completed</strong><small>{active} active · {providerCount} provider{providerCount === 1 ? "" : "s"} in persisted history</small></div></article>
      <article className="stat-card"><div className="icon-box mint"><ShieldCheck/></div><div><span>Clone engine</span><strong>{status?.cloneEngineAvailable ? "Ready" : "Checking"}</strong><small>Restricted IPC · isolated Git</small></div></article>
    </section>
    <section className="panel" aria-label="Provider job counts"><span className="eyebrow">Provider activity · recent persisted jobs</span><p>{providerActivity}</p></section>
    <section className="two-column"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">Getting started</span><h3>Secure clone checklist</h3></div></div><ol className="checklist"><li className={folder ? "done" : "current"}><CheckCircle2/><div><strong>Select a parent folder</strong><span>Grant access through the Windows picker.</span></div></li><li><span className="step">2</span><div><strong>Review source and mode</strong><span>Only approved public HTTPS provider URLs are accepted.</span></div></li><li><span className="step">3</span><div><strong>Confirm and verify</strong><span>Progress and the resolved commit are stored honestly.</span></div></li></ol></div><div className="panel quiet"><span className="eyebrow">Recent activity</span><div className="empty-compact"><GitBranch size={32}/><h3>{jobs?.jobs[0] ? `${jobs.jobs[0].status}: ${jobs.jobs[0].mode}` : "No clone activity"}</h3><p>{jobs?.jobs[0]?.sourceUrl ?? "Completed jobs appear only after verified results are recorded."}</p></div></div></section>
  </div>;
}
