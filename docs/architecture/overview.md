# Atlas Nexus architecture

Status: Stage 0 design, 2026-10-12. All components below are planned; no runtime exists. Windows 11 is the first target, Android the second.

## Product and ownership boundaries

The core workflow is discovery -> URL validation -> download mode -> approved destination -> explicit start -> download -> verification -> vault -> static inspection -> optional research -> report. AI failure must not prevent folder, clone, or vault operations. Ordinary website snapshots are a separately approved capability after the Git engine is secure, not a way to recover private website source.

Nexus is an independent workspace at D:\newl\ATLAS NEXUS. Atlas source, deployments, authentication, MongoDB, and credentials are outside its mutation scope. Reference source may inform independently implemented contracts; reuse requires verified licensing. No runtime connection to Atlas production is planned.

## Monorepo responsibilities

| Location | Owner and responsibility | First stage |
| --- | --- | --- |
| apps/desktop/electron | Trusted main process: windows, dialogs, policy enforcement, service orchestration | 1 |
| apps/desktop/preload | Small typed contextBridge API; no raw IPC or Node primitives | 1 |
| apps/desktop/src | React/Vite shell, accessible navigation, theme, notifications, error boundary | 1 |
| packages/ui | Shared tokens and reusable web components; mobile shares tokens rather than DOM widgets | 1, expanded 8 |
| packages/types | Versioned request/result, job, repository, verification, and research DTOs | 1 onward |
| packages/validation | Strict Zod schemas shared with privileged services | 1 onward |
| packages/security | Path grants, Windows names, URL policy, redaction, safe rendering policy | 1 onward |
| packages/storage | SQLite connection, numbered transactional migrations, repositories/settings/jobs | 1 onward |
| packages/git-engine | Trusted executable discovery, argument-based Git runner, cancellation, verification | 2 |
| packages/clone-manager | Durable lifecycle, staging ownership, collision-safe promotion, retry policy | 2-3 |
| packages/source-analysis | Bounded static readers, manifests, evidence-backed analysis, no execution | 4 |
| packages/integrations | Provider adapters and research provider interfaces | 5-6 |
| services/ai-research | Optional isolated Python wrapper for GPT Researcher | 5 |
| apps/mobile/src | Expo companion using Android storage permissions and SAF | 7 |
| tests, scripts, docs | Fixtures, integration/security checks, build/release helpers, stage evidence | Every stage |

Create directories when their implementation begins; empty package placeholders do not count as functioning features.

## Desktop trust boundary

Package local UI only. BrowserWindow must explicitly use contextIsolation=true, nodeIntegration=false, sandbox=true, and webSecurity=true. Define a restrictive production CSP and separate development policy. Deny navigation, popups, unexpected permission requests, and arbitrary protocol handlers. Prefer a registered application protocol with safe path mapping. Validate IPC sender frame, owning window, expected origin, payload schema, size, and capability before performing an operation. These follow the [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security).

The main process owns filesystem and SQLite access. Renderer requests use opaque directory grants, repository IDs, and job IDs, not arbitrary filesystem paths. A picker grant covers a selected parent and narrow descendant operations; it is not general drive access. Revalidate persisted grants at startup and immediately before writes. Never return ipcRenderer, fs, child_process, or generic read/write/execute methods to the renderer.

Proposed Stage 1 API surface: selectParentFolder, getFolderInfo(grantId), previewDestination(grantId, name), createChildFolder(grantId, name), getSettings, updateSettings, and getAppStatus. Each returns a discriminated success/error DTO with a request ID and safe error code. Cancellation from the picker is a normal result. Later clone APIs accept validated settings and directory grant IDs; opening a destination requires a library-owned validated folder reference.

Blocking hashing, scans, and SQLite work must not freeze rendering. Use a service worker/utility process where appropriate, with validated messages and quotas; process separation alone does not provide a filesystem sandbox.

## Filesystem and download model

User sources live under user-selected destinations. Application metadata, staging ledger, logs, manifests, and reports live under Electron userData, outside sources. Initial SQLite database: userData/nexus.sqlite; generated artifacts: userData/reports/<repositoryId>/<reportId>. Never place .env files or complete Git object stores inside the database.

Folder creation uses one validated child segment within an approved parent, an exclusive mkdir, and revalidation of the parent identity and reparse points. Reject reserved device names (including extensions), separators, traversal, alternate data streams, trailing dots/spaces, and unsupported namespaces. Initially reject UNC/device paths and reparse-point destinations until separately tested. A selected drive root can be a parent, but never an automatic recursive cleanup target. Accessible drives come from the native picker; do not probe or mutate every volume.

Clones use a unique sibling staging directory on the destination volume, an ownership ledger, bounded Git execution, and verification before publication. Publication must use a tested no-replace operation; a pre-existence check followed by an ordinary rename is insufficient against races. If an appropriate atomic directory primitive is unavailable, fail safely or reserve an exclusive app-owned final directory and use a recoverable publication protocol that cannot replace unrelated content. Record publication state before and after filesystem changes so startup can reconcile a crash.

Retries start a new controlled operation unless validated checkpoint semantics support narrower recovery. Failed/cancelled staging remains identifiable and outside completed vault records. Never recursively clean an arbitrary user path; cleanup requires exact app ownership, resolved containment, and a separately clear user action.

## Git modes and verification

Stage 2.3 accepts canonical public HTTPS repository URLs on exactly `github.com`, `gitlab.com`, `codeberg.org`, `gitea.com`, and `v15.next.forgejo.org`. GitLab supports validated nested namespace segments; the other providers require owner/repository paths. Optional `.git` is normalized. Embedded credentials, ports, query, fragment, control characters, encoded paths, local/file/SSH/git/helper protocols, redirects, and unapproved hosts are rejected. Repository cloning is provider-neutral transport work; Stage 6 search, discovery, health, and pagination adapters remain unimplemented.

Snapshot records an exact resolved commit, source tree, manifest, and mode; it makes no history claim. Prefer controlled Git object acquisition and bounded tree materialization rather than introducing unsafe ZIP extraction. Full clone records accessible history under ordinary clone semantics, not hidden objects or every local tracking branch. Mirror produces a bare ref/object archive and no working tree. [Git clone documentation](https://git-scm.com/docs/git-clone) defines the differences.

Run a trusted Git binary by argument array with shell=false, a controlled environment, disabled terminal prompts, trusted empty template, isolated global/system configuration, approved HTTPS transport, disabled hooks/external filters/credential helpers, no recursive submodules, and GIT_LFS_SKIP_SMUDGE=1. Do not inherit settings enabling alternate URL rewrites, arbitrary helpers, or project filters. Validate redirect policy and apply time, output, process, disk, and concurrency limits. The Stage 2 implementation must test exact behavior against its supported Git version; these are requirements, not verified controls. Consult [Git configuration documentation](https://git-scm.com/docs/git-config).

Before completion, verify object integrity, resolved revision/refs appropriate to the mode, bounded tree entries, safe checkout paths, file enumeration, and source manifest. Detect submodules, LFS pointers, inaccessible extras, binary/symlink limitations, and Windows case/path collisions. Distinguish transport success, verified Git objects, verified local files, and resource completeness. Skipped required resources yield Partial with reasons, not an unqualified Completed. Full and mirror modes cannot prove access to remote hidden objects. Progress phases and per-phase percentages must not imply a known total network size.

## SQLite and lifecycle

Plan numbered transactional schema migrations, foreign keys, indexes, busy timeout, and a tested journal policy. Take a backup before an incompatible migration and require authorization for destructive changes. Stage 1 creates schema/settings only; Stage 2 adds jobs; Stage 3 adds manifests/library history.

Planned entities: settings, folder_grants, repositories (provider identity and provenance), local_clones (mode/revision/folder), jobs, job_events, verification_runs, manifest_entries, scan_runs, findings, research_sessions, and report_references. Store relative normalized manifest paths, algorithms, size, SHA-256, timestamp, and scan policy/version. A changed manifest is evidence of change, not proof of maliciousness; user-requested editing must remain a separate workflow.

Job statuses: Queued, Validating, Downloading, Verifying, Completed, Partial, Failed, Cancelled, Interrupted. Record mode, source, revision request/resolution, approved destination identity, staging ownership, timestamps, safe error class, phase, and event sequence. On startup mark stale active jobs Interrupted; reconcile publication before proposing a retry. Never replay automatically or promise byte-for-byte resume. Completed and Partial both need a verification summary; Failed/Cancelled are not promoted as completed repositories.

## Static analysis and AI

Read files as bounded data; never import code, follow out-of-root links, execute scripts, install dependencies, render active HTML, or run downloaded binaries. Reports separate facts, warnings, and AI suggestions and carry file/line/hash evidence. Potential secrets reports reveal category and location, not the credential. Unsupported manifest versions and missing evidence remain explicit unknowns.

AI modes are disabled, local Ollama, optional GPT Researcher wrapper, and explicitly configured cloud providers. Pass selected, bounded, redacted excerpts with evidence IDs. Cloud consent must show what is transmitted, endpoint/provider, retention limitations, and source selection; consent is scoped and revocable. Local mode must also control embeddings, retrieval, and telemetry rather than assuming all processing is local. Validate citation IDs, source hashes, and locations; an existing citation does not itself prove a claim is correct.

Prefer a spawned Python wrapper with bounded framed JSON over stdio and no listener. If HTTP becomes necessary, bind loopback only with an unpredictable session credential, strict request validation, origin controls, and limits. Disable upstream MCP commands, uploads, arbitrary URLs/path configuration, image generation, and web retrieval by default. License inconsistency and dependency/egress review must be resolved before Stage 5 installs or redistributes GPT Researcher; see reference review.

## Android and network policy

Stage 7 is a companion: discovery, saved metadata, reports, browsing, and source snapshots via supported storage APIs. SAF URI references replace unrestricted desktop paths. Native Git is a later separately tested milestone. Windows remote jobs require explicit opt-in pairing, authentication, device revocation, and scoped permissions; no internet-facing listener or automatic network exposure. No HTTP backend is needed for the initial desktop core.

## Toolchain and conventions

Stage 1 must select supported exact Electron, Node, React, Vite, TypeScript, Tailwind, Zod, test, and SQLite-driver versions after compatibility checks; commit a lockfile and document npm ci. Host Node v26.7.0 was observed, but host Node compatibility does not prove Electron's bundled Node or a native SQLite module works. Prefer a supported LTS toolchain following the [Node release policy](https://nodejs.org/en/about/previous-releases); do not change global tools in Stage 0.

Use strict TypeScript, unknown at untrusted boundaries, explicit DTO versions, schema validation on both sides of IPC, request IDs, typed safe errors, bounded logs, and accessible components. Keep secrets in privileged secure storage, never renderer bundles. Maintain focused tests, security fixtures, stage reports, and environment documentation. Theme tokens start with Midnight Aurora (#0B1020, #151D33, #38BDF8, #A78BFA, #34D399) and tested light equivalents. Full polish comes in Stage 8; basic access and focus behavior starts in Stage 1.
