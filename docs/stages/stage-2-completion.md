# ATLAS NEXUS — STAGE 2 IMPLEMENTATION AND VERIFICATION REPORT

## Identity and scope

- Workspace: `D:\newl\ATLAS-NEXUS-OWNER`
- Branch: `codex/stage2-secure-clone-engine`
- Accepted baseline: `8c2f84dda033b0df6219fb5c3842f6a9d1fce942`
- Implementation checkpoint: `ecd290c feat: add secure Stage 2 clone engine`
- Publication: local commits only; no push, pull request, merge, deployment, or Stage 3 work
- Protected owner content: untracked `README_FOR_OWNER.md` and `evidence/` were not staged or modified

## Implemented modules

`CloneService` is the single trusted clone/process controller. Existing FolderService grants, validated IPC, CommonJS preload bridge, React shell, and sql.js database are extended rather than replaced. SQLite migration 2 adds durable phase, progress, commit, verification, safe-error, retry, and lifecycle timestamps. Additive migration 3 clears stale progress from unsuccessful terminal records and normalizes Completed to 100 without deleting any job. Legal state transitions and serialized writes prevent terminal jobs from becoming completed later; startup reconciliation marks unfinished work Interrupted without automatic network retry.

The renderer now provides URL, mode, native parent selection, child name, exact destination preview, a required confirmation, real phase status, cancellation, two-step retry confirmation, completed destination opening, persisted Clone Manager history, and real Dashboard counts. Stage 3 Vault, Stage 4 Source Inspector, and Stage 5 AI Research remain future features.

## Clone modes and verification

- Snapshot: shallow single-branch download at a resolved commit, pre-checkout Git-tree validation, Git integrity check, bounded source-tree scan, and removal of `.git` before publication.
- Full: normal fetched clone history with working tree and `.git`, pre-checkout tree validation, resolved HEAD, and `git fsck --full`.
- Mirror: genuine `git clone --mirror`, bare-repository assertion, refs enumeration, resolved HEAD, and `git fsck --full`; no working tree claim.

The live gated suite uses the small public `https://github.com/octocat/Hello-World.git` fixture. All three modes completed and recorded real 40-character commits. LFS pointer files are reported from a bounded scan; submodules are not initialized; unreachable remote objects or external LFS content are not claimed.

## Security and filesystem controls

- Git uses `spawn` argument arrays, `shell: false`, hidden subprocess windows, and owned process-tree termination.
- Stage 2.3 accepts only the five approved HTTPS repository hosts; userinfo, nondefault ports, query/fragment data, encoding, traversal, local/SSH transports, and other hosts are rejected.
- Global/system config, credential helpers/prompts, redirects, non-HTTPS protocols, hooks, filters, LFS smudge, symlink checkout, and recursive submodules are disabled. TLS verification stays enabled.
- Numeric limits: one concurrent job, 15 minutes, 1 MB captured process output, 50,000 files, 2 GiB materialized data, 100 displayed retained records, and zero automatic retries.
- Parent and destination are revalidated before staging and publication. A unique stage has a job ownership ledger. Recursive cleanup requires exact name and ledger proof. Publication never intentionally replaces a destination.
- Source code is not executed and dependencies are not installed.

## Verification evidence

- Baseline: `npm.cmd run check` — 12 files / 48 tests passed; production build and CommonJS preload verified.
- Stage 2.1 routine suite: 15 files passed plus one gated live file skipped; 76 tests passed and 5 live cases skipped during the routine run.
- Stage 2 live suite: one file / 5 tests passed for three real modes, cancel/retry, and unavailable-repository handling.
- `npm.cmd run typecheck` — PASS.
- `npm.cmd run build` — PASS; CommonJS preload verified.
- `npm.cmd audit --json` — PASS; 0 vulnerabilities across 299 dependencies reported by npm.
- `git diff --check` — PASS apart from informational LF-to-CRLF conversion warnings.
- First staged secret-pattern scan — zero matches.

## Stage 2.1 final hardening

- Failed, Cancelled, Interrupted, and Partial jobs now persist `progressPercent = null`, including existing records migrated from schema version 2. The Clone Manager ignores stale numeric values for every unsuccessful status and renders an explicit “not completed” terminal state. Only Completed can display a green 100% bar.
- Git subprocess failures are phase-aware. Explicit authentication denial maps to `PRIVATE_REPOSITORY`; missing/private/indistinguishable prompt-blocked sources map to `REPOSITORY_UNAVAILABLE`; TLS/DNS/connectivity failures map to `TRANSPORT_ERROR`; post-download Git failures map to `VERIFICATION_FAILED`; destination races remain `PATH_COLLISION`. Raw Git output is not exposed to the renderer.
- GitHub deliberately does not reliably distinguish a nonexistent public URL from a private repository to unauthenticated callers. The unavailable message therefore states “not found, private, or unavailable” instead of claiming knowledge the application does not have.
- G03 now has an instrumented hostile local Git fixture proving that checkout hooks, inherited external filters, LFS smudge, inherited URL rewrites, local transport, and recursive submodules do not execute or fetch unexpectedly.
- G04–G06 coverage now includes real temporary-filesystem collision and reparse substitution, exact ownership-ledger cleanup, retained foreign staging, actual file/byte limit failures, active Git-process cancellation, persisted interruption normalization, and synthetic OS error-code mapping for permission, collision, disk-full, and quota failures.
- Final Stage 2.1 verification: typecheck PASS; 15 routine test files / 76 tests PASS; one gated live file / 5 GitHub tests PASS; production build PASS; bundled CommonJS preload PASS; npm audit reports 0 vulnerabilities across 299 dependencies; `git diff --check` PASS with informational line-ending warnings only.

## Native Windows acceptance

The owner reported successful Windows application Snapshot, Full Clone, and Mirror downloads and PowerShell-confirmed Git structures. These outcomes establish owner-reported native G01 evidence only. Active cancellation, confirmed retry, history persistence after restart, production-mode cloning, and clean shutdown were not reported and remain NOT RUN. Automated and live subprocess evidence does not establish those UI outcomes or real owner-session permission denial and disk-full behavior.

Owner procedure:

The remaining procedure is maintained in [Stage 2 owner acceptance](../testing/stage-2-owner-acceptance.md). It uses new disposable child names only and must not touch the owner's successful clones or existing SQLite records.

## Decision

**PENDING NATIVE ACCEPTANCE.** G01–G05 pass with the evidence qualifications above. G06 retains real owner-session offline, ACL-denied, and disk-full/quota checks. Required native active cancellation, confirmed retry, restart persistence, production-mode cloning, and clean shutdown remain NOT RUN. Stage 3 must not begin until the owner accepts Stage 2 or explicitly authorizes work despite these documented gaps.

## Stage 2.3 multi-forge extension — 2026-10-14

The existing secure clone engine now accepts exactly five public HTTPS endpoints: GitHub, GitLab, Codeberg, Gitea.com, and `v15.next.forgejo.org`. A shared validator detects the provider, normalizes `.git`, preserves namespace provenance, supports GitLab nested groups, and rejects credentials, alternate ports, encoded paths, unsafe segments, extra non-GitLab path components, and every unapproved host or scheme. Redirects, inherited URL rewrites, credential acquisition, hooks, filters, LFS smudge, recursive submodules, and non-HTTPS transports remain disabled.

Additive SQLite migration 4 adds provider, namespace, and repository-name fields and backfills legacy GitHub job records in the same transaction without recreating the database or deleting history. Regression fixtures preserve Completed/Failed/Cancelled/Interrupted/Partial jobs, settings, preferred folders, commit metadata, timestamps, and retry lineage through migration and restart; injected backfill failure leaves original file bytes unchanged. Clone Manager and Clone from URL display provider-aware identity; Dashboard derives per-provider counts from real persisted jobs. Stage 6 discovery/search adapters remain unimplemented.

Final verification reports 15 routine files / 120 tests PASS, with 2 live files / 20 cases explicitly skipped in ordinary runs. Both live suites were separately enabled and passed 20/20 cases: 15 approved-forge/mode combinations plus the original five GitHub cases. Each provider is probed with isolated `ls-remote` before download; published Snapshot bytes match Full checkout bytes, Snapshot has no `.git`, Full is non-bare and non-shallow with verified HEAD, and Mirror is bare with mirror configuration and refs matching the probe. Typecheck, production build, preload verification, dependency audit (zero vulnerabilities / 299 dependencies), and diff checks pass.

The final security review fixed raw URL traversal, encoded hostname/dot segments, backslashes, repeated path separators, and empty query/fragment markers before URL normalization can erase them. Provider rate limits, HTTP access denials, temporary failures and anti-bot refusals receive fixed safe messages; verification failures take precedence over remote-error text. Diagnostic credentials are not returned in error messages.

An existing native development window at `http://localhost:5174/` rendered the new header, persisted Dashboard counts, and detected GitLab correctly. The native picker opened and navigated to a fresh ignored test parent, but automation could not reliably operate its selection controls; no new native clone was started. The earlier managed-session production launch emitted profile/cache access errors (`0x5`) and a DPAPI decrypt error before startup failed; these messages do not establish the exact failure cause. No ACL, cache, sandbox, or credential-store workaround was attempted. New native clone/mode checks, active cancellation/retry, restart, production rendering/cloning, and clean shutdown remain NOT RUN. See [the Stage 2.3 report](stage-2-3-implementation.md) for the final evidence and owner handoff.
