# Atlas Nexus Stage 1.1 native recovery

Date: 2026-10-12
Branch: `stage1-windows-desktop-foundation`
Scope: Electron recovery, Windows acceptance, Git transport diagnosis, and initial local Git preparation. Stage 2 was not started.

## Outcome

The Atlas Nexus source has no confirmed application-level launch defect in this environment. Electron 44.7.0 consistently raises `EXCEPTION_ACCESS_VIOLATION` before `app.whenReady()` in both development and production launch modes. A standalone minimal Electron program reaches only module evaluation and fails identically. Even `electron.exe --help` crashes after printing help, while `--version` and `ELECTRON_RUN_AS_NODE=1` succeed. This places the failure in Electron/Chromium initialization or its interaction with the managed Windows session, before BrowserWindow, preload, renderer, SQLite, or Atlas IPC initialization.

This is an unresolved environment/runtime diagnosis, not proof of an Electron product defect or a normal interactive Windows failure. A separate interactive Windows run is required.

## Stage 1.2 owner verification review

No evidence from a normal owner-controlled Windows PowerShell session was present in the workspace. The only files beneath `local-data/stage-1-native-recovery` are the earlier managed-session logs; no `manual` diagnostic directory, owner checklist, screenshot, WER export, or later lifecycle trace was found. Consequently, no native result was upgraded to PASS and the Electron diagnosis remains bounded to the managed session.

## Evidence

| Probe | Result |
| --- | --- |
| Host Node/npm/Git | Node 26.7.0, npm 11.19.0, Git 2.49.0.windows.1 |
| Electron | 44.7.0; embedded Node 24.21.0 and Chromium 152.0.7977.130 |
| Environment | `ELECTRON_RUN_AS_NODE` and `NODE_OPTIONS` absent; no value or secret printed |
| Electron `--version` | PASS |
| Electron embedded Node mode | PASS |
| Electron `--help` | FAIL — 0xC0000005 after help output |
| Minimal Electron, default | FAIL — module loaded, then 0xC0000005 before ready |
| Minimal Electron, `--disable-gpu` | FAIL — identical boundary |
| Minimal Electron, GPU and compositing disabled | FAIL — identical boundary |
| Atlas production main | FAIL — `module-loaded` only; no `app-ready` |
| Atlas development mode | FAIL — Vite starts, then same 0xC0000005; `module-loaded` only |
| Windows session metadata | PowerShell reports an interactive session (session 4); OS CIM query denied by the managed environment |
| Windows Application Error/WER query | No matching event was returned in the available Application log window |
| Windows UI automation | NOT RUN — native control pipe unavailable twice with OS error 2 |

GPU flags did not change the crash, so hardware acceleration was not disabled in application code. Chromium sandboxing, Defender, and certificate verification were not disabled. Local-only Electron crashReporter was briefly probed, but Crashpad could not connect in this environment; it was removed from application startup diagnostics because diagnostics must not destabilize the app.

## Recovery changes

- Added an opt-in, local-only lifecycle diagnostic writer. Enable it with `ATLAS_NEXUS_DIAGNOSTICS=1`; it records only bounded allowlisted phase/error fields and never uploads data.
- Added main-process checkpoints for module load, app readiness, window creation, database open, renderer load failure/success, child loss, renderer loss, startup failure, and shutdown.
- Added a minimal `scripts/electron-smoke.cjs` fixture and `npm.cmd run diagnose:electron` command to distinguish Electron runtime failures from Atlas application failures.
- Added a regression test proving diagnostic fields drop token/path-like data.

No secure BrowserWindow preference, sandbox, context isolation, IPC validation, renderer isolation, or TLS protection was weakened.

## Manual Windows acceptance procedure

Run these steps in a normal interactive Windows 11 PowerShell from the repository root. Do not run as administrator unless ordinary user launch is separately proven insufficient.

1. Run `npm.cmd ci`, `npm.cmd run check`, then `npm.cmd run diagnose:electron`. The smoke process should exit normally.
2. Enable the local diagnostic environment variables documented in README and run `npm.cmd start`. Confirm the log progresses through `app-ready`, `window-created`, `database-opened`, and `renderer-loaded`.
3. Confirm the Dashboard appears and contains zero repositories rather than examples.
4. Navigate every sidebar item using mouse and keyboard. Confirm Source Inspector and AI Research remain explicitly unavailable.
5. In Folder Manager, browse to a disposable parent directory using the native picker. Cancel once and confirm cancellation is non-error.
6. Create a uniquely named child. Confirm the preview path, success result, and filesystem location.
7. Attempt the same name again. Confirm collision rejection and that existing content is unchanged.
8. Use Open in Explorer and confirm Explorer opens the exact granted folder.
9. Switch dark, light, and system themes. Restart and verify persisted settings/preferred folder.
10. Enter invalid Git URLs including `file:`, HTTP, credential-bearing HTTPS, unsupported hosts, extra paths, and malformed text. Confirm rejection.
11. Enter a valid public GitHub HTTPS repository URL. Confirm validation succeeds but the Stage 1 clone action remains disabled and never reports completion.
12. Verify visible keyboard focus, tab order, and activation with Enter/Space.
13. Close the app. Confirm the process exits normally and the final diagnostic phase is `before-quit`.

Record each result as PASS, FAIL, WARNING, or NOT RUN. A failure requires FIX STAGE; successful evidence can close F01, F02, and F06.

## Git HTTPS diagnosis

The configured Git 2.49.0 uses system `http.sslBackend=schannel` and credential helper `manager`. Git Credential Manager 2.6.1 is callable through Git. No explicit `http.sslVerify` override, Git askpass override, terminal-prompt override, or SSH-command override was found.

In the Codex execution environment, ordinary `git ls-remote https://github.com/SUSI-BALAN/ATLAS-NEXUS.git` fails with `SEC_E_NO_CREDENTIALS`. The command-scoped supported comparison `git -c http.sslBackend=openssl ls-remote ...` succeeds and returns no refs, independently confirming that the designated repository resolves and is empty. TLS verification remained enabled. This supports a Schannel/environment-specific diagnosis, but a normal interactive PowerShell result was not available from this session and must be compared manually before changing any persistent Git configuration.

Manual comparison command: `git ls-remote https://github.com/SUSI-BALAN/ATLAS-NEXUS.git`. An empty successful result means the remote is still empty. Do not paste credentials or diagnostic authorization headers into reports.

## GitHub preparation status

- The local branch remains `stage1-windows-desktop-foundation`; HEAD is unborn.
- The existing remote list is empty. The designated URL was independently reached with command-scoped OpenSSL and returned no refs.
- Adding `origin` failed because the managed sandbox denied locking `.git/config`.
- Exact staging then failed because the same boundary denied creating `.git/index.lock`. The interactive tool identity separately rejected the sandbox-owned repository as dubious ownership.
- No global `safe.directory`, credential, Schannel, TLS, ownership, or ACL setting was changed.
- The reviewed initial commit contains exactly the paths in `stage-1-initial-commit-files.txt`. The pre-stage worktree scan found zero secret-pattern matches, zero prohibited artifacts, and zero files over 5 MiB.
- No commit SHA exists, `origin` is not configured, and no push was attempted.

Stage 1.2 additionally confirmed that no `.lock` file exists anywhere beneath `.git`; the failure is permission/identity related rather than a stale index lock. The visible workspace owner is the owner account, while Git operations executed as the owner previously reported sandbox ownership for `.git`. The sandbox identity can read Git metadata but cannot create `.git/index.lock` or lock `.git/config`. These differing security views make an in-place ownership change risky without an owner-reviewed ACL plan.

Preferred recovery is a separate owner-controlled working copy: copy only the 61 manifest paths (never `.git`, `node_modules`, caches, builds, logs, or databases), initialize Git there on `stage1-windows-desktop-foundation`, verify inventory and hashes, then repeat the staged checks. An in-place ownership/ACL correction is an alternative only after the owner reviews the exact current ACL and target identity. Do not delete/reinitialize this repository or change ownership automatically.

On the owner’s normal PowerShell, first verify `git status --short --branch` and `git remote -v`. If ownership is trusted there, stage only the manifest with `git add --pathspec-from-file=docs/stages/stage-1-initial-commit-files.txt --`, repeat cached inventory/secret/whitespace checks, commit with `feat: establish secure Atlas Nexus desktop foundation`, then stop. Add `origin` only if it is still absent and non-conflicting. A later push to `main` requires separate explicit authorization and a fresh empty-remote check.

## Native acceptance matrix

| Check | Result |
| --- | --- |
| Window opens | NOT RUN — Electron runtime crashes before ready in managed session |
| Dashboard renders | NOT RUN |
| Navigation works | WARNING — automated renderer tests pass; native UI not run |
| Folder picker opens | NOT RUN |
| Folder creation/collision | WARNING — real filesystem integration tests pass; native UI not run |
| Explorer opens selected folder | NOT RUN |
| Theme controls and restart persistence | WARNING — settings persistence test passes; native UI not run |
| Invalid URLs rejected | PASS — unit and renderer integration tests |
| Clone action disabled | PASS — renderer integration test |
| Keyboard navigation | NOT RUN |
| Clean application close | NOT RUN |

## Gate

Stage 2 remains **NO-GO** until the manual native acceptance procedure passes. A local Git commit may be prepared independently; pushing requires a separate explicit owner authorization and a fresh check that the remote remains empty.
