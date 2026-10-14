# ATLAS NEXUS — STAGE 2 IMPLEMENTATION AND VERIFICATION REPORT

## Identity and scope

- Workspace: `D:\newl\ATLAS-NEXUS-OWNER`
- Branch: `codex/stage2-secure-clone-engine`
- Accepted baseline: `8c2f84dda033b0df6219fb5c3842f6a9d1fce942`
- Implementation checkpoint: `ecd290c feat: add secure Stage 2 clone engine`
- Publication: local commits only; no push, pull request, merge, deployment, or Stage 3 work
- Protected owner content: untracked `README_FOR_OWNER.md` and `evidence/` were not staged or modified

## Implemented modules

`CloneService` is the single trusted clone/process controller. Existing FolderService grants, validated IPC, CommonJS preload bridge, React shell, and sql.js database are extended rather than replaced. SQLite migration 2 adds durable phase, progress, commit, verification, safe-error, retry, and lifecycle timestamps. Legal state transitions and serialized writes prevent terminal jobs from becoming completed later; startup reconciliation marks unfinished work Interrupted without automatic network retry.

The renderer now provides URL, mode, native parent selection, child name, exact destination preview, a required confirmation, real phase status, cancellation, two-step retry confirmation, completed destination opening, persisted Clone Manager history, and real Dashboard counts. Stage 3 Vault, Stage 4 Source Inspector, and Stage 5 AI Research remain future features.

## Clone modes and verification

- Snapshot: shallow single-branch download at a resolved commit, pre-checkout Git-tree validation, Git integrity check, bounded source-tree scan, and removal of `.git` before publication.
- Full: normal fetched clone history with working tree and `.git`, pre-checkout tree validation, resolved HEAD, and `git fsck --full`.
- Mirror: genuine `git clone --mirror`, bare-repository assertion, refs enumeration, resolved HEAD, and `git fsck --full`; no working tree claim.

The live gated suite uses the small public `https://github.com/octocat/Hello-World.git` fixture. All three modes completed and recorded real 40-character commits. LFS pointer files are reported from a bounded scan; submodules are not initialized; unreachable remote objects or external LFS content are not claimed.

## Security and filesystem controls

- Git uses `spawn` argument arrays, `shell: false`, hidden subprocess windows, and owned process-tree termination.
- Only GitHub HTTPS repository URLs are accepted; userinfo, ports, query/fragment data, encoded separators, local/SSH transports, and other hosts are rejected.
- Global/system config, credential helpers/prompts, redirects, non-HTTPS protocols, hooks, filters, LFS smudge, symlink checkout, and recursive submodules are disabled. TLS verification stays enabled.
- Numeric limits: one concurrent job, 15 minutes, 1 MB captured process output, 50,000 files, 2 GiB materialized data, 100 displayed retained records, and zero automatic retries.
- Parent and destination are revalidated before staging and publication. A unique stage has a job ownership ledger. Recursive cleanup requires exact name and ledger proof. Publication never intentionally replaces a destination.
- Source code is not executed and dependencies are not installed.

## Verification evidence

- Baseline: `npm.cmd run check` — 12 files / 48 tests passed; production build and CommonJS preload verified.
- Stage 2 routine suite: 13 files passed plus one gated live file skipped; 55 tests passed and 5 live cases skipped during the routine run.
- Stage 2 live suite: one file / 5 tests passed for three real modes, cancel/retry, and unavailable-repository handling.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run build` — PASS; CommonJS preload verified.
- `npm.cmd audit --json` — PASS; 0 vulnerabilities across 299 dependencies reported by npm.
- `git diff --check` — PASS apart from informational LF-to-CRLF conversion warnings.
- First staged secret-pattern scan — zero matches.

## Native Windows acceptance

NOT RUN in an owner-controlled interactive Windows desktop for this implementation session. Automated and live subprocess evidence does not establish native picker interaction, visible progress/cancel timing, restart behavior, production GUI cloning, Explorer opening, clean application shutdown during an active clone, real permission denial, disk-full/quota handling, or reparse substitution resistance.

Owner procedure:

1. In a disposable local parent, launch `npm.cmd run dev`; confirm Dashboard, Settings, themes, keyboard navigation, and the native picker still work.
2. Clone the same small approved public fixture separately as snapshot, full, and mirror. Confirm exact destinations, snapshot has no `.git`, full has `.git` and a working tree, and mirror is bare without a working tree.
3. Pre-create a target and confirm no overwrite. Start another clone, cancel while active, confirm no final destination, then use Review retry and Confirm retry.
4. Restart after observing persisted completed/failed/cancelled history. Separately terminate the app during an active disposable job and confirm it becomes Interrupted and does not restart automatically.
5. Exercise a real permission-denied parent, offline/network failure, low-space disposable volume if safely available, and a concurrent destination creation. Verify unrelated file hashes remain unchanged.
6. Run `npm.cmd run build` and `npm.cmd start`; repeat one successful mode, open its destination, close during idle and active work, and inspect DevTools/diagnostics for CSP, preload, renderer, and shutdown errors.

## Decision

**PENDING NATIVE ACCEPTANCE.** Core implementation, routine automation, and public GitHub mode tests pass. G03 retains an instrumented-hostile-fixture warning and G06 retains real Windows fault-injection gaps. These are not silently upgraded to PASS. Stage 3 must not begin until the owner accepts Stage 2 or explicitly authorizes work despite the documented gaps.
