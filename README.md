# Atlas Nexus

Local-first repository cloning, source inspection, and optional research for Windows first, Android second.

## Current status

Stage 1 was fully implemented and accepted on 2026-10-13. The owner reported successful Windows 11 development and production GUI acceptance, including native folder management, collision protection, Explorer opening, keyboard controls, themes, SQLite persistence, and clean shutdown. Repository clone execution deliberately remains disabled until Stage 2. No installer or Android application is available yet.

Final acceptance passed strict typechecking, 48 tests across 12 files, production build, CommonJS preload verification, and the dependency audit. The CommonJS preload and development-only React Refresh CSP corrections are complete. See the [Stage 1 report](docs/stages/stage-1-completion.md) for evidence provenance and the [native recovery report](docs/stages/stage-1-native-recovery.md) for historical diagnostics.

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
- Repository cloning, website fetching, source execution, dependency installation, LFS, and submodules are not implemented in Stage 1.
- Atlas and GPT Researcher remain read-only references; no source was copied.

Read the [architecture](docs/architecture/overview.md), [threat model](docs/security/threat-model.md), [roadmap](docs/stages/roadmap.md), and [acceptance matrix](docs/testing/acceptance-matrix.md). The owner's stage controls remain in force: stop after each stage; no commit, push, deployment, or publication is implied.
