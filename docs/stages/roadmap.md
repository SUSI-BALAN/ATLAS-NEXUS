# Atlas Nexus roadmap and Stage 1 plan

The owner's master prompt controls scope. Each stage needs a fresh branch/commit/status check, focused plan, relevant tests/typechecks/build, changed-file/security review, warnings, and completion report. Stop after passing gates; wait for NEXT STAGE. No upload/publish without explicit authorization. A failed critical acceptance gate prevents completion.

## Feature matrix and order

| Stage | Deliverable | Actual baseline | Completion gate |
| --- | --- | --- | --- |
| 0 | Workspace/reference audit, architecture, threat model, matrix, conventions, plan | Documentation foundation only | Documents independently reviewable; evidence and unknowns explicit |
| 1 | Electron/React shell, Dashboard, Settings, Folder Manager, native picker/create, drive selection, SQLite, themes/errors | Implemented; automated checks pass; native GUI gate not verified in current session | Native launch/picker and non-overwriting folders; restricted IPC; persistence and checks |
| 2 | Public GitHub HTTPS snapshot/full/mirror jobs; preview, destination, progress, cancel/retry, verification | Implemented on feature branch; automated and live GitHub gates pass; native GUI/fault acceptance pending | Real public test repo, revision/integrity, collision races, cancellation, LFS/submodule honesty |
| 3 | Vault, manifests/SHA-256, tree, history, search, storage, missing-folder and interrupted recovery | Not implemented | Restart durability, changed-file detection, bounded reading, no unrelated deletion |
| 4 | Static language/framework/dependency/README/license/config/entry/security/readiness analysis | Not implemented | Known fixtures yield evidence-backed results; no execution or external-path access |
| 5 | Disabled/Ollama/GPT Researcher/cloud modes, Q&A/history/reports/citations | Not implemented | Disabled works; configured local success; consent, citation and failure controls |
| 6 | GitHub/GitLab/Codeberg/Gitea/Forgejo discovery and validated connectors; filters, details, provenance, health, collections | Not implemented | Each adapter independently tested; explicit unsupported/rate-limited states |
| 7 | Expo Android companion, SAF snapshot storage, browsing/reports/themes/notifications; optional authenticated pairing | Not implemented | Android builds and actual device storage/permission tests |
| 8 | Midnight Aurora design system; desktop/mobile refinement; tree/code/research/history panels; shortcuts/accessibility | Not implemented | Visual evidence, keyboard/state visibility, accessibility/performance checks |
| 9 | Windows installer and available Android artifacts, release docs/retention/notes and full verification | Not implemented | Built/tested artifact identities and required security/failure gates; no automatic publication |

Stage 6 adds saved references and collections; watchlists/change tracking and analytics are reference capabilities whose full Nexus feature scope must be explicitly planned before implementation. Do not label them complete from connector presence. Basic Stage 1 UI uses accessible theme/navigation foundations; later navigation items must honestly identify unavailable functions without simulating product success.

## Deferred and conditional capabilities

Private repository credentials require a secure store and provider-specific authorization after public cloning works. LFS and submodules are explicit later opt-ins with separate destination/network/verification policy. Android native full Git is a separate real-device milestone, never equivalent to ZIP downloads. Website archiving is a separately approved post-core feature. Automatic source edits, cloned-code execution, dependency installs, public desktop APIs, arbitrary forge hosts, and unlimited downloads are not part of the initial product promise. Generated reports stay outside source trees.

## Stage 1 implementation record

The following plan was executed on 2026-10-12. Automated checks passed; native launch, picker, and visual review remain unverified because the available Windows runtime exited before exposing a window and the Computer Use native pipe was unavailable. See `stage-1-completion.md` for exact evidence.

1. Recheck the Nexus tree and any new owner changes. Initialize an independent Git repository if still absent; select/document the branch without making a commit unless authorized. Establish npm workspaces and exact compatible versions with a lockfile. Validate host LTS/Electron Node/SQLite driver compatibility before choosing a native driver. No Atlas dependency tree or code copy.
2. Create apps/desktop and only the packages needed now (types, validation, security, storage, UI). Enable strict TS and deterministic typecheck/test/build scripts. Document dev and packaged environments and safe userData test isolation. Review install scripts for the trusted application toolchain; never install cloned repository dependencies.
3. Implement a secure BrowserWindow, local application protocol, bounded preload bridge, validated IPC routing, denied navigation/popups/permissions, production CSP, and safe errors. Test sender/window/frame/grant boundaries with real Electron where possible.
4. Implement native parent-folder picker, opaque grants, selected path/storage information and destination preview. Cancellation and unsupported/unknown storage states are explicit. Drive selection uses the native dialog; do not promise all volumes are accessible.
5. Implement child-name validation and exclusive child creation inside a granted parent. Validate resolved parent and reparse policy before write; return collision/permission/storage errors. Add Windows boundary/race fixtures. Do not implement source downloads in Stage 1.
6. Initialize SQLite migrations/settings in userData. Persist valid preferences/theme/folder references, revalidate folder access after restart, test transaction rollback and permission failures. No destructive migrations or source data in SQLite.
7. Implement working Dashboard, Settings, Folder Manager, navigation, dark/light/system theme tokens, accessible focus, error boundary, and real notifications. Empty Dashboard shows actual zero/unknown state. Unimplemented roadmap screens must never display invented jobs or success.
8. Run strict typecheck, meaningful unit/integration/security tests, production build, fresh launch, native picker/create/cancel/collision/permission cases, theme/restart persistence, and keyboard review. Capture actual launch/visual evidence and log results. If native UI checks cannot run, mark NOT RUN and do not claim the launch/picker acceptance gate passed.
9. Review changed files, IPC privileges, logs/secrets, database location, source protection, and dependency/license results. Produce the required Stage 1 report and stop.

## Stage 1 risks to resolve

Normal terminal execution failed during Stage 0; direct process execution through an alternate runtime worked. The patch helper likewise worked only through alternate execution. Git HTTPS ls-remote failed with SEC_E_NO_CREDENTIALS; this blocks current transport verification and may affect later dependency downloads. Do not disable TLS validation or credential protections. Host Node v26.7.0 alone does not establish a compatible release toolchain. Neither Electron installation/runtime nor a SQLite application driver has been validated. Resolve these during setup and report actual outcomes.

Atlas root licensing is unclear and GPT Researcher license metadata conflicts; these block source copying/optional integration decisions, not independent Stage 1 implementation. Ollama/adb were absent from PATH; Android and configured AI runtime checks remain future gates. Java/SQLite CLI existence is not proof of Android SDK or application SQLite compatibility.
