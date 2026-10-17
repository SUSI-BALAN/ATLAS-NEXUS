# ATLAS NEXUS — STAGE 2.3 MULTI-FORGE IMPLEMENTATION REPORT

Decision: **PENDING NATIVE ACCEPTANCE**. Automated and live Git acceptance pass. Required native clone, lifecycle, and real Windows fault checks remain open.

Evidence update (2026-10-17): the owner profile now contains independently correlated Completed artifacts for 13 of 15 provider/mode combinations. GitLab Full and Gitea.com Snapshot remain missing. Native lifecycle and production acceptance remain pending. See [the evidence reconciliation](../testing/stage-2-3-evidence-reconciliation-2026-10-17.md) for exact job IDs, destinations, commits, timestamps, verification results, and the qualified failed GitLab Mirror record.

## Workspace and commits

- Workspace: `D:\newl\ATLAS-NEXUS-OWNER`
- Continued branch: `codex/stage2-secure-clone-engine`
- Verified starting HEAD: `2f5a6a6c5507f068f1b521a3481e167c15016259`
- Implementation: `35c97f98f3b6924b68d4fef549bbe45e0f005cae`
- Initial evidence documentation: `ccfa8563df1c0a1cb869ec5843bcb6281f7767eb`
- Verified final implementation: `2de35b5367d4329d79d08b644aed225b4ad2fa1c`
- This report is committed afterward; the final documentation HEAD is recorded in the chat handoff.

All commits are local. No push, pull request, merge, deployment, Stage 3 implementation, or Stage 6 discovery work was performed. `README_FOR_OWNER.md` and `evidence/` remain untracked and excluded from staging. Existing owner clones were not modified or deleted. Native interaction did not start a new clone. The empty disposable native-test parent is retained under ignored `local-data/`.

## Implemented changes

A shared `parseGitRemoteUrl` validator admits exactly the five endpoints below. It returns provider identity/label, hostname, normalized clone URL, namespace, repository name, and the compatibility owner field. GitLab accepts nested group paths. The GitHub-only compatibility parser remains available.

Original input is checked before URL parsing can normalize traversal or backslashes. Credentials, unsupported schemes/hosts, nondefault ports, whitespace/control characters, percent encoding, repeated path separators, dot segments, query/fragment markers, and malformed source paths are rejected. HTTPS's explicit default port is normalized. GitLab web-route `/-/` paths are rejected. Normalization adds one `.git` suffix and preserves namespace/name spelling.

The existing `CloneService` handles all providers with its established Snapshot, Full, and Mirror logic. No provider-specific process runner was added. Shell-free argument arrays, TLS verification, disabled redirects, isolated environment/configuration, denied credential helpers/prompts, hooks/filters/LFS smudge/submodule restrictions, destination grants, owned staging and publication checks remain in place. IPC sender validation, preload permissions, CSP, renderer sandboxing and isolation were not broadened.

Safe errors now distinguish rate limits, temporary service/anti-bot refusal, explicit authentication denial, indistinguishable unavailable/private sources, network/TLS errors and verification errors. Fixed messages do not expose raw Git diagnostics or embedded credentials. Verification-phase failures are classified as verification errors regardless of words appearing in Git output.

SQLite migration 4 adds provider, namespace and repository-name columns and performs legacy metadata backfill in the same transaction. It changes no old status, source URL, destination, timestamps, commit, retry lineage, setting, or preferred-folder row. Tests cover five legacy terminal states, settings/folders, close/reopen equality, nested GitLab provenance, and preservation of original database bytes when injected backfill fails. No owner database reset or replacement was used for testing.

Clone from URL detects the provider and displays full namespace/name while preserving mode, destination preview and confirmation. Clone Manager displays persisted provider/namespace/name plus existing status, commit, verification, cancel and retry controls. The header derives its provider count from the configured allowlist. Dashboard shows real per-provider counts from its recent persisted job list; no provider health indicator was fabricated. Midnight Aurora styling and future-stage placeholders remain intact.

## Actual automated evidence

Windows execution date: 2026-10-14, Asia/Calcutta. The starting routine baseline passed 76 tests; final checks retain the old coverage and add new assertions.

| Command/check | Actual result |
| --- | --- |
| `npm.cmd run check`, final run started 23:08:43 | PASS: typecheck, 15 routine test files / 120 tests, production build |
| Routine live-test gates | 2 files / 20 cases SKIPPED by design; no live PASS inferred from skips |
| Both live environment flags enabled; two live files explicitly selected, started 23:03:44 | PASS: 2 files / 20 tests, 53.12 seconds |
| `npm.cmd run verify:preload` | PASS: bundled CommonJS preload, 1,684 bytes |
| `npm.cmd audit --json` | PASS: zero vulnerabilities; 299 dependencies reported |
| Working and staged `git diff --check` | PASS; informational LF-to-CRLF notices only |
| Exact staged-path allowlist and secret-pattern checks | PASS: approved code paths only; zero secret-pattern matches |
| Privileged process/transport/IPC review | PASS: shared validator before Git; transport configuration and IPC authority unchanged |

The live matrix probes each exact fixture with isolated `git ls-remote` before downloading. It compares each completed commit with the probed HEAD. Independent checks require Snapshot `.git` absence and source hashes matching Full; Full `.git`, non-bare/non-shallow structure and actual HEAD; Mirror bare/mirror configuration, actual HEAD and refs matching the remote probe. Every job closes/shuts down in `finally` before fixture cleanup.

| Provider / approved host | Actual public fixture | Snapshot | Full | Mirror |
| --- | --- | --- | --- | --- |
| GitHub / `github.com` | `octocat/Hello-World` | PASS | PASS | PASS |
| GitLab / `gitlab.com` | `gitlab-org/gitlab-test` | PASS | PASS | PASS |
| Codeberg / `codeberg.org` | `ciphel/01Hello_World` | PASS | PASS | PASS |
| Gitea.com / `gitea.com` | `apachenpub/accept-test` | PASS | PASS | PASS |
| Forgejo Next / `v15.next.forgejo.org` | `kavemand/.forgejo` | PASS | PASS | PASS |

The original five GitHub live cases also passed: three modes, cancellation/explicit retry, and unavailable-repository handling. The initially guessed Forgejo URL `forgejo/forgejo` was unavailable; the actual public `kavemand/.forgejo` fixture was verified and used. No anti-bot or access barrier was bypassed. These endpoints and refs can change later. GitLab nested namespaces have parser and storage coverage; a nested public GitLab live fixture was not executed.

## G01–G06 and native evidence

| Gate | Status and qualification |
| --- | --- |
| G01 | PASS automated/live for all 15 provider/mode cases; current-revision native clones NOT RUN |
| G02 | PASS URL/transport isolation tests; redirects disabled; no live hostile HTTPS redirect server exercised |
| G03 | PASS instrumented hostile hook/filter/LFS/config/transport/submodule fixture |
| G04 | PASS temporary-filesystem collision/reparse/ownership cleanup tests; no owner source overwrite |
| G05 | PASS automated owned-process cancellation and live cancel/retry; native active cancellation, confirmed retry, restart and shutdown NOT RUN |
| G06 | WARNING: automated error mapping, limits, reparse and cleanup tests pass; actual owner-session offline, ACL-denied and constrained-volume disk/quota faults NOT RUN |

Observed Windows native evidence: an existing development window loaded from `http://localhost:5174/`, rendered the five-forge header and real persisted Dashboard counts, and detected GitLab/full source identity in Clone from URL. The picker opened and navigated to a fresh disposable workspace parent. Selection controls returned unavailable cached elements; keyboard focus metadata disagreed with the visible address-bar state. Native clone acceptance was not inferred from these observations, and no network clone was started through that UI.

The production-preview launch attempt built but emitted cache/profile access errors (`0x5`), a DPAPI decrypt error and `Atlas Nexus failed to start`. Its exact startup cause was not established. The later existing development-window observation does not establish production rendering. No caches, ACLs, credentials, TLS, or sandbox settings were changed.

The owner must cancel any remaining picker manually and execute [the owner procedure](../testing/stage-2-owner-acceptance.md). Current-revision native downloads for all providers, native cancellation/retry, history after restart, production cloning/rendering and clean shutdown remain NOT RUN. Earlier owner-reported successful GitHub downloads are retained as historical evidence.

## Remaining limits

No failing automated code gate remains. Native acceptance is the completion blocker. G06 real Windows fault checks remain open; mocks do not establish real ACL/quota behavior. Forgejo Next is a changeable test service. Git object transfer/storage has no independent preflight bound, and Mirror object storage is not covered by the materialized working-tree scan; the 15-minute timeout is applied per Git subprocess. Existing LFS content and submodules are deliberately not fetched. Tooling `DEP0205`, renderer bundle size, and the observed managed-session cache/DPAPI errors remain documented warnings.

## Files changed from the Stage 2.1 baseline

| Area | Files |
| --- | --- |
| Contract/validation | `packages/types/src/index.ts`; `packages/validation/src/index.ts`; `packages/validation/src/index.test.ts` |
| SQLite | `packages/storage/src/index.ts`; `packages/storage/src/index.test.ts` |
| Git service/tests | `apps/desktop/electron/cloneService.ts`; `cloneService.test.ts`; new `cloneService.multiForge.live.test.ts` |
| UI/tests | `apps/desktop/src/App.tsx`; `App.test.tsx`; `pages/ClonePage.tsx`; `pages/CloneManager.tsx`; `pages/CloneManager.test.ts`; `pages/Dashboard.tsx` |
| Documentation | `README.md`; `docs/architecture/overview.md`; `docs/security/threat-model.md`; `docs/stages/roadmap.md`; `docs/stages/stage-2-completion.md`; this report; `docs/testing/acceptance-matrix.md`; `docs/testing/stage-2-owner-acceptance.md` |

Stage 2.3 provides repository cloning from supplied approved URLs. Stage 6 search/discovery, pagination, health adapters and collections remain unimplemented. Stage 3 is not begun.
