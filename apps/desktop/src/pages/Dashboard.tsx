import { ArrowRight, CheckCircle2, Folder, GitBranch, ShieldCheck } from "lucide-react";
import type { JSX } from "react";
import type { AppStatus, FolderGrant } from "@atlas-nexus/types";
import type { PageId } from "../App";

export function Dashboard({ status, folder, navigate }: { status: AppStatus | null; folder: FolderGrant | null; navigate: (page: PageId) => void }): JSX.Element {
  return <div className="page stack-xl">
    <section className="hero-card"><div><span className="eyebrow">Your source workspace</span><h2>Research starts with a safe destination.</h2><p>Choose a local folder now. Repository downloads begin in Stage 2 after URL, destination, and operation review.</p><div className="button-row"><button className="primary" onClick={() => navigate("folders")}>Choose destination <ArrowRight size={17}/></button><button className="secondary" onClick={() => navigate("clone")}>Prepare clone</button></div></div><div className="orbit" aria-hidden="true"><div className="orbit-core">AN</div><span/><span/><span/></div></section>
    <section className="stats-grid" aria-label="Application status">
      <article className="stat-card"><div className="icon-box cyan"><Folder/></div><div><span>Preferred destination</span><strong>{folder ? folder.name : "Not selected"}</strong><small>{folder?.path ?? "Choose a local parent folder"}</small></div></article>
      <article className="stat-card"><div className="icon-box violet"><GitBranch/></div><div><span>Repository vault</span><strong>0 repositories</strong><small>No sample records are inserted</small></div></article>
      <article className="stat-card"><div className="icon-box mint"><ShieldCheck/></div><div><span>Local services</span><strong>{status?.databaseReady ? "Ready" : "Checking"}</strong><small>SQLite · restricted renderer</small></div></article>
    </section>
    <section className="two-column"><div className="panel"><div className="panel-heading"><div><span className="eyebrow">Getting started</span><h3>Foundation checklist</h3></div></div><ol className="checklist"><li className={folder ? "done" : "current"}><CheckCircle2/><div><strong>Select a parent folder</strong><span>Grant access through the Windows picker.</span></div></li><li><span className="step">2</span><div><strong>Validate a GitHub URL</strong><span>Review clone mode and resolved destination.</span></div></li><li><span className="step">3</span><div><strong>Clone in Stage 2</strong><span>No repository process runs in this release.</span></div></li></ol></div><div className="panel quiet"><span className="eyebrow">Recent activity</span><div className="empty-compact"><GitBranch size={32}/><h3>No clone activity</h3><p>Completed jobs will appear only after the Stage 2 engine records verified results.</p></div></div></section>
  </div>;
}
