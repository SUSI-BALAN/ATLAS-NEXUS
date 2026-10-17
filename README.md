# Atlas Nexus

Local-first repository cloning, source inspection, and optional research for Windows first, Android second.

## Current status

Stage 2.3 is implemented on the local `codex/stage2-secure-clone-engine` branch. Atlas Nexus now performs explicitly confirmed public HTTPS source snapshots, full working clones, and bare mirrors from GitHub, GitLab, Codeberg, Gitea.com, and the approved Forgejo Next test instance through one isolated main-process Git service. Clone jobs include provider and namespace provenance alongside resolved commits, phases, safe errors, cancellation, retry lineage, verification summaries, and interruption recovery in SQLite. Native owner acceptance is still pending; no installer or Android application is available yet.

Stage 2.1 adds truthful unsuccessful-job progress, phase-aware safe errors, schema migration 3, hostile Git execution-isolation fixtures, active process cancellation coverage, reparse/collision tests, and resource fault coverage. See the [Stage 2 completion report](docs/stages/stage-2-completion.md) and [owner acceptance procedure](docs/testing/stage-2-owner-acceptance.md) for exact evidence and remaining native checks.

Stage 2.3 adds the exact five-provider validator, transactional migration 4, provider-aware UI/history, and independently checked live mode semantics. Final evidence is 120 routine tests and 20 separately enabled live tests passing; see the [Stage 2.3 implementation report](docs/stages/stage-2-3-implementation.md). Native acceptance remains pending.

## Requirements

- Windows 11 for native desktop verification
- Git and Node.js 24 with bundled npm (the project requires Node.js 22.12 or newer)

SQLite is provided by the pure-WASM `sql.js` driver. This avoids Electron native-addon ABI rebuilds while still writing a real versioned SQLite database beneath Electron's per-user `userData` directory.

## Development commands

```powershell
git clone https://github.com/SUSI-BALAN/ATLAS-NEXUS.git
Set-Location -LiteralPath 'ATLAS-NEXUS'
npm.cmd ci
npx.cmd --no-install install-electron
Test-Path -LiteralPath '.\node_modules\electron\dist\electron.exe'
Test-Path -LiteralPath '.\node_modules\electron\path.txt'
npx.cmd --no-install electron --version
```

Electron 44.7.0 downloads its desktop binary separately from `npm ci`; the explicit `install-electron` command uses the locked package and skips downloading when that version is already installed. Both paths should then exist and Electron should report `v44.7.0`. If installation fails, inspect its actual error and network access, then retry `npx.cmd --no-install install-electron` after resolving the cause. Keep TLS verification and Electron security protections enabled.

Run development mode with `npm.cmd run dev`. Run verification from the repository root:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run verify:preload
npm.cmd audit --json
```

Live GitHub acceptance is opt-in and creates only disposable temporary fixtures:

```powershell
$env:ATLAS_NEXUS_LIVE_GITHUB = '1'
npm.cmd test -- --run apps/desktop/electron/cloneService.live.test.ts
Remove-Item Env:ATLAS_NEXUS_LIVE_GITHUB
```

The Stage 2.3 five-provider matrix is separately opt-in and exercises Snapshot, Full, and Mirror for each approved endpoint:

```powershell
$env:ATLAS_NEXUS_LIVE_FORGES = '1'
npm.cmd test -- --run apps/desktop/electron/cloneService.multiForge.live.test.ts
Remove-Item Env:ATLAS_NEXUS_LIVE_FORGES
```

After closing the development application and stopping its server with Ctrl+C, run `npm.cmd run build` followed by `npm.cmd start` to build and launch the production preview. This does not produce an installer. Owner-reported development and production GUI acceptance passed.

Stage 1.4 uses an exact SHA-256 CSP allowance for Vite's React Refresh preamble only during development. Production has no preamble hash, localhost connection, or WebSocket exception. See the [Stage 1.4 CSP acceptance procedure](docs/stages/stage-1-4-csp-fix.md).

For an opt-in, local-only lifecycle trace in PowerShell:

```powershell
$env:ATLAS_NEXUS_DIAGNOSTICS = '1'
$env:ATLAS_NEXUS_DIAGNOSTICS_DIR = Join-Path $PWD 'local-data\stage-1-native-recovery\manual'
npm.cmd start
Remove-Item Env:ATLAS_NEXUS_DIAGNOSTICS, Env:ATLAS_NEXUS_DIAGNOSTICS_DIR
```

The diagnostic log contains only allowlisted lifecycle fields and is ignored by Git. It performs no upload. Do not use `--no-sandbox` or disable certificate verification while diagnosing launch or Git transport.

## Publication and continuous integration

Stage 1 source is published on GitHub's `main` branch at `caae38ce4b70a2fa1d2f65378bdbd5b38b5e074b`. The Windows CI workflow runs on pushes to `main` and pull requests targeting `main`. It uses Node.js 24, lockfile installation with `npm ci`, typecheck, tests, production build, CommonJS preload verification, and dependency audit. Official actions are pinned to commit SHAs, permissions are limited to `contents: read`, and checkout credentials are not persisted. CI does not run native desktop acceptance. Hosted results remain pending until the workflow is published and actually runs.

Nonfatal Chromium disk/GPU cache warnings, tooling `DEP0205`, and renderer bundle-size warnings remain documented maintenance items. Preserve existing user data and caches during investigation.

## Safety boundaries

- Renderer Node integration is disabled; context isolation and renderer sandboxing are enabled.
- The preload exposes only typed, allowlisted operations. Main-process handlers validate payloads and the calling frame.
- Folder writes require an opaque grant from a native user selection, validate the real parent path, reject reparse points and dangerous Windows names, and create children exclusively without overwriting.
- Stage 2.3 cloning supports public HTTPS repository URLs only on the exact five allowlisted hosts. GitLab nested namespaces are supported; arbitrary self-hosted forges, credentials, SSH, URL rewrites, and redirects remain denied. Git runs with shell interpolation disabled, isolated configuration, no credential helper or prompt, hooks disabled, HTTPS-only protocol, TLS verification, LFS smudge disabled, and no recursive submodules.
- Downloaded source is never executed and dependencies are never installed. Snapshots omit `.git`; full clones retain it; mirrors are bare. LFS pointer files and uninitialized submodules are reported rather than silently resolved.
- Limits are one concurrent job, 15 minutes, 1 MB captured Git diagnostics, 16 MiB bounded structured Git stdout, 50,000 files, and 2 GiB of materialized data. No automatic retry occurs after restart.
- Atlas and GPT Researcher remain read-only references; no source was copied.

Read the [architecture](docs/architecture/overview.md), [threat model](docs/security/threat-model.md), [roadmap](docs/stages/roadmap.md), and [acceptance matrix](docs/testing/acceptance-matrix.md). The owner's stage controls remain in force: stop after each stage; no commit, push, deployment, or publication is implied.
