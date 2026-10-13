# Atlas Nexus

Local-first repository cloning, source inspection, and optional research for Windows first, Android second.

## Current status

Stage 1 application code is implemented. The workspace now contains a secure Electron main process and preload bridge, a React/TypeScript renderer, Midnight Aurora themes, a controlled Folder Manager, GitHub URL validation, and versioned SQLite persistence. The Git clone engine is intentionally unavailable until Stage 2.

Automated typechecking, 42 tests, the production build, and the dependency audit pass. Stage 1.1 isolated the current native crash to Electron/Chromium startup before `app.whenReady()`: a minimal Electron fixture and `electron --help` fail with the same access violation in the managed session. Native UI verification therefore remains open. See the [Stage 1 report](docs/stages/stage-1-completion.md) and [native recovery report](docs/stages/stage-1-native-recovery.md).

## Requirements

- Windows 11 for native desktop verification
- Node.js 22.12 or newer (the implementation was checked with Node.js 26.7.0)
- npm 11 or a compatible npm release

SQLite is provided by the pure-WASM `sql.js` driver. This avoids Electron native-addon ABI rebuilds while still writing a real versioned SQLite database beneath Electron's per-user `userData` directory.

## Development commands

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run dev
npm.cmd run diagnose:electron
```

After a successful build, `npm.cmd start` runs the production preview. The current managed session could not provide native window evidence; run it from a normal interactive Windows desktop before accepting Stage 1.

For an opt-in, local-only lifecycle trace in PowerShell:

```powershell
$env:ATLAS_NEXUS_DIAGNOSTICS = '1'
$env:ATLAS_NEXUS_DIAGNOSTICS_DIR = Join-Path $PWD 'local-data\stage-1-native-recovery\manual'
npm.cmd start
Remove-Item Env:ATLAS_NEXUS_DIAGNOSTICS, Env:ATLAS_NEXUS_DIAGNOSTICS_DIR
```

The diagnostic log contains only allowlisted lifecycle fields and is ignored by Git. It performs no upload. Do not use `--no-sandbox` or disable certificate verification while diagnosing launch or Git transport.

## Git preparation status

The intended remote is `https://github.com/SUSI-BALAN/ATLAS-NEXUS.git`. Read-only command-scoped OpenSSL verification reached it and returned no refs. Stage 1.2 found no owner-generated native acceptance evidence and confirmed the managed identity still cannot write `.git/config` or `.git/index`; no stale lock file exists. Therefore `origin` was not added and no local commit was created. The exact reviewed 61-file allowlist is in `docs/stages/stage-1-initial-commit-files.txt`. No push was attempted.

## Safety boundaries

- Renderer Node integration is disabled; context isolation and renderer sandboxing are enabled.
- The preload exposes only typed, allowlisted operations. Main-process handlers validate payloads and the calling frame.
- Folder writes require an opaque grant from a native user selection, validate the real parent path, reject reparse points and dangerous Windows names, and create children exclusively without overwriting.
- Repository cloning, website fetching, source execution, dependency installation, LFS, and submodules are not implemented in Stage 1.
- Atlas and GPT Researcher remain read-only references; no source was copied.

Read the [architecture](docs/architecture/overview.md), [threat model](docs/security/threat-model.md), [roadmap](docs/stages/roadmap.md), and [acceptance matrix](docs/testing/acceptance-matrix.md). The owner's stage controls remain in force: stop after each stage; no commit, push, deployment, or publication is implied.
