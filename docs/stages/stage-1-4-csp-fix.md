# Stage 1.4 final CSP fix

Stage 1.4 fixes development renderer startup without weakening the packaged application policy. `@vitejs/plugin-react` 5.0.4 injects one inline module preamble for React Refresh. Development CSP permits that exact byte sequence through its SHA-256 source expression and permits only loopback HTTP/WebSocket connections needed by the Vite client. It does not enable `unsafe-inline` or `unsafe-eval` for scripts.

Production keeps `script-src 'self'` and `connect-src 'self'`; it contains no React Refresh hash, localhost origin, or WebSocket exception. BrowserWindow context isolation, renderer sandboxing, web security, disabled Node integration, denied permissions, navigation controls, and the restricted preload bridge are unchanged.

Automated acceptance requires:

1. The pinned plugin's exported preamble for base `/` exactly matches the hashed application constant.
2. An independently calculated SHA-256 matches the CSP source expression.
3. Development policy includes the one script hash and loopback HMR connections, with no script `unsafe-inline` or `unsafe-eval`.
4. Production policy excludes the hash, loopback hosts, and WebSocket sources.
5. Typecheck, all tests, production build, and preload verification pass.
6. A normal Windows 11 session launches both development and production modes without a CSP violation, React preamble error, preload error, or renderer startup error.

## Verification record

On 2026-10-13, `npm.cmd run typecheck`, the full Vitest suite (12 files, 48 tests), `npm.cmd run build`, `npm.cmd run verify:preload`, and `git diff --check` passed. The build produced and verified the bundled CommonJS preload. The automated session could build the development main and preload bundles and start the Vite renderer server, but its local `node_modules/electron/dist/electron.exe` was absent, so `electron-vite` stopped with `Electron uninstall` before an app process or renderer console existed. Native confirmation is therefore intentionally left to the owner procedure below; no runtime PASS is inferred from the build checks.

## Owner evidence review (2026-10-13)

The owner later supplied four post-fix native Windows screenshots and transcribed PowerShell excerpts. They verify that Electron 44.7.0 was installed in the owner workspace, development mode reached `start electron app...`, and the Dashboard, Clone from URL, Folder Manager, and Settings views visibly rendered. A fifth screenshot is the historical pre-fix blank renderer and is retained only as regression context.

This evidence establishes the development rendering outcome, including that the earlier CSP/preamble failure no longer prevents the UI from appearing. It does not establish a clean post-fix DevTools console, React Fast Refresh, native control activation, production `npm.cmd start`, a `renderer-loaded` diagnostic, or clean shutdown. Repeated Chromium disk/GPU cache initialization warnings (`0x5` / `-2`) were nonfatal to the captured UI, but their exact cache path, effective process identity, ACL/lock cause, and persistence impact remain unverified. Source inspection found no application override of Electron's `sessionData` or cache path. No cache, database, user data, ACL, or security setting was changed during review.

The owner evidence package remains local and untracked because a screenshot exposes a local account/database path. It is not approved for a public Git commit.

## Owner GUI acceptance

Run from the repository root in a normal, non-administrator Windows PowerShell:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run verify:preload
npm.cmd run dev
```

With the development window open, check DevTools Console for absence of `Executing inline script violates Content Security Policy`, `@vitejs/plugin-react can't detect preamble`, preload errors, and renderer startup errors. Confirm the Dashboard renders, edit and save a renderer source file, and confirm Fast Refresh updates the window. Close the app, then verify the production path:

```powershell
$env:ATLAS_NEXUS_DIAGNOSTICS = '1'
$env:ATLAS_NEXUS_DIAGNOSTICS_DIR = Join-Path $PWD 'local-data\stage-1-native-recovery\manual'
npm.cmd start
Remove-Item Env:ATLAS_NEXUS_DIAGNOSTICS, Env:ATLAS_NEXUS_DIAGNOSTICS_DIR
```

Confirm the production Dashboard renders, DevTools reports no preload/renderer startup error, and the diagnostic trace reaches `renderer-loaded`. Record development and production results as PASS, FAIL, WARNING, or NOT RUN. Do not begin Stage 2 from this procedure.
