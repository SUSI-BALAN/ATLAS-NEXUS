# Acceptance and verification matrix

PASS = observed successful verification. FAIL = attempted check failed. WARNING = partial verification or known limitation. NOT RUN = not performed. Plans and source inspection never establish runtime PASS. Every future check records command, result, fixture/platform, timestamp, and artifact identity where applicable.

## Stage 0 evidence

| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| A00 | Inventory current workspace, including hidden entries | PASS | Directory enumeration returned zero entries before documentation creation |
| A01 | Nexus Git baseline | WARNING | git status --short and git rev-parse --show-toplevel returned not a Git repository; no branch/SHA exists |
| A02 | Locate prototype/ZIP/README/scripts/tests/master plan | PASS | None present in this directory; conversation prompt is specification; no broader private-drive search performed |
| A03 | Installed Git/Node/npm/Python tools | PASS | 2.49.0.windows.1 / v26.7.0 / 11.19.0 / 3.13.7 version commands succeeded |
| A04 | Normal terminal process startup | FAIL | exec_command failed twice with helper_unknown_error / setup refresh had errors; alternate direct process runner worked |
| A05 | Reference Git HTTPS reachability | FAIL | Both git ls-remote <reference-url> HEAD calls failed SEC_E_NO_CREDENTIALS; TLS protections unchanged |
| A06 | Reference source/API/config/test inspection | PASS | GitHub connector file reads and protected local Atlas reads; identities and findings in reference-review.md |
| A07 | Reference licenses and integration constraints | WARNING | Atlas root LICENSE 404; GPT Researcher LICENSE Apache-2.0 vs MIT metadata; no code copied |
| A08 | Protected local Atlas Git state | PASS | --no-optional-locks, command-scoped safe.directory: clean stage7-release-readiness at 5e4e1414c18ba6386adddc9914fb562411715795 |
| A09 | Nexus typecheck/unit/integration/security/E2E/build | NOT RUN | No package manifest/application/test runner exists; no successful app checks inferred |
| A10 | Dependency vulnerability audit | NOT RUN | No Nexus dependency graph installed; reference dependency declarations are not an audit |
| A11 | Native launch/SQLite/Git clone/AI/Android device checks | NOT RUN | Runtime features not implemented |
| A12 | Required documents and local links | PASS | Post-write verification found required files, readable content, valid local Markdown links, no trailing whitespace |
| A13 | Final change/scope review | PASS | Only 8 documentation/ignore files exist in Nexus; no package/database/runtime; final Atlas status remains clean |

## Stage gates to execute later

| ID / stage | Acceptance scenario | Required evidence | Current result |
| --- | --- | --- | --- |
| F01 / 1 | Launch development and built Electron windows with safe environment-specific CSP and restricted bridge | Real launch; exact React Refresh preamble hash in development only; loopback-only HMR; production excludes hash/localhost/WebSocket exceptions; no CSP, preamble, preload, or renderer startup errors; renderer privilege and IPC origin/sender assertions | PASS — automated Stage 1.4 CSP/preload/security regressions pass; owner reported on 2026-10-13 that the post-fix development console had no CSP, preload, React preamble, or uncaught startup errors, Fast Refresh worked, production rendered the Dashboard, diagnostics recorded `renderer-loaded`, and shutdown was clean. These final nine-group outcomes are owner-reported; no additional console capture or diagnostic file was independently inspected. Chromium disk/GPU cache initialization remains a separate nonfatal WARNING. |
| F02 / 1 | Native picker selects C:/D:/other accessible parent and cancels normally | Windows UI evidence and selected grant/path DTO | PASS — owner reported on 2026-10-13 that the native picker opened, folder selection worked, and cancellation was harmless. No additional picker screenshot or structured result file was independently inspected. |
| F03 / 1 | Valid child created; existing file/dir never replaced | Temp-parent integration tests, collision/race assertions, actual permission failure | PASS — automated temporary-directory creation and collision tests pass; owner reported successful disposable child creation and duplicate rejection without overwrite. A real OS permission-denied case remains NOT RUN and is not required for this native happy-path/collision gate. |
| F04 / 1 | Reserved names, ADS, traversal, namespaces, reparse escape rejected | Windows policy/security fixtures | PASS — validation/security fixtures pass; parent reparse rejection implemented |
| F05 / 1 | Preferences/theme persist; stale folder permission handled; SQLite migration rollback | Restart/integration checks in isolated userData | PASS — SQLite migration, empty schemas, and automated restart persistence pass; owner reported System/Dark/Light switching and selected-theme persistence after restart. Injected rollback and a real stale-permission failure remain NOT RUN as documented resilience coverage. |
| F06 / 1 | Dashboard/Settings/Folder Manager work with keyboard and error states | Actual UI review and test assertions; no invented data | PASS — owner screenshots verify rendered Dashboard, Clone from URL, Folder Manager, and Settings views; owner reported native folder creation/collision messaging, exact-destination Explorer opening, visible focus, Tab/Shift+Tab navigation, Enter/Space activation, and expected disabled states. Final interaction outcomes are owner-reported without new independently inspected recordings. |
| G01 / 2 | Public GitHub repo snapshot, full clone, mirror have correct semantics | Real small owned/public fixture, revision/refs/tree/object verification | PASS — opt-in live tests cloned `octocat/Hello-World` in all three modes, recorded 40-character HEADs, ran mode-specific Git integrity/bare checks, and published only verified output |
| G02 / 2 | URL schemes/helpers/credentials/redirects cannot bypass policy | Regression fixtures and mocked transport redirects | PASS — URL regression cases reject non-HTTPS/non-GitHub/userinfo/path variants; Git system/global config, prompts/helpers, non-HTTPS protocols, and redirects are disabled; TLS remains verified using Git for Windows OpenSSL backend |
| G03 / 2 | No hooks/filters/submodules/LFS smudge run implicitly | Instrumented fixture and process/config assertions | WARNING — argument/environment policy and pre-checkout symlink/unsafe-name tests pass; hooks, filters, LFS smudge, and recursive submodules are disabled. A hostile instrumented live repository is not yet independently exercised |
| G04 / 2 | Collision-safe staging promotion and explicit start | Concurrent destination creation test, unchanged foreign file hashes | PASS — exclusive destination revalidation catches post-preview creation; unique owned staging and ledger-bounded cleanup are tested; renderer requires explicit confirmation before IPC start |
| G05 / 2 | Cancellation terminates owned process tree; retry reports real status | Long-running controlled fixture; no false completion | PASS — live cancellation produced `Cancelled`, did not publish, and only an explicitly requested retry completed; illegal durable transitions and startup interruption reconciliation are tested |
| G06 / 2 | Offline, permission, quota/disk-full, large tree, path conflicts fail safely | Fault injection plus platform verification for real OS behavior | WARNING — unavailable GitHub repository, path conflicts, invalid trees, output/file/byte/time limits, and safe errors are covered; real offline, permission-denied, disk-full/quota, and forced verification/publication failures remain owner-native NOT RUN |
| V01 / 3 | Vault survives restart; manifest recheck detects altered/missing files | SHA-256 fixtures, persistent DB/restart evidence | NOT RUN |
| V02 / 3 | Crash during download/verify/promotion/DB record reconciles correctly | Process interruption integration tests; no deletion/replay | NOT RUN |
| V03 / 3 | File tree/search/storage/missing-folder states use bounded real data | Fixture integration/UI evidence | NOT RUN |
| S01 / 4 | Language/framework/manifests/license/config/readiness findings are accurate | Known fixture expectations with file/line evidence | NOT RUN |
| S02 / 4 | Malicious content cannot execute/install/import or escape source | Execution traps, symlink, malformed/oversize fixture tests | NOT RUN |
| S03 / 4 | Potential secrets are redacted, unknowns explicit, sources unchanged | Synthetic secrets, before/after hashes, report assertions | NOT RUN |
| R01 / 5 | Disabled AI leaves non-AI workflows usable | Integration/UI checks with no provider calls | NOT RUN |
| R02 / 5 | Configured local model and optional Python module produce valid grounded reports | Actual configured runtime, citation validation, zero unexpected egress | NOT RUN |
| R03 / 5 | Timeout/unavailable/injection/fake citations/denied consent safe | Failure/security integration fixtures | NOT RUN |
| R04 / 5 | Dependency/license/egress review passes pinned optional module | Exact version, resolved dependency audit, license evidence | NOT RUN |
| P01 / 6 | Each forge search/details/pagination/health/rate-limits validated independently | Per-adapter fixtures and controlled public live tests | NOT RUN |
| P02 / 6 | Collections/provenance/private credential handling correct | Persistent integration tests, redacted logs, access denial | NOT RUN |
| M01 / 7 | Android snapshot SAF destination permission/revocation works | Android build plus real-device test identity/results | NOT RUN |
| M02 / 7 | Pairing is opt-in/authenticated/revocable; native Git not overclaimed | Device/network security tests and feature matrix | NOT RUN |
| U01 / 8 | Desktop/mobile theme, focus, shortcuts, responsive important states | Actual screenshots/viewports/keyboard/accessibility results | NOT RUN |
| U02 / 8 | Loading/errors/progress/history/code/research remain usable | Interaction/performance checks against real data | NOT RUN |
| L01 / 9 | All required regression/typecheck/test/build checks pass | Commands/results and final branch/SHA/change review | NOT RUN |
| L02 / 9 | Windows installer install/uninstall/data-retention behavior verified | Built binary hash/version, clean Windows install/uninstall tests | NOT RUN |
| L03 / 9 | Available Android artifacts match supported capability claims | Build hash/device/permission matrix; native Git separately tested | NOT RUN |
| L04 / 9 | Release docs, reproducibility, licenses, known limitations complete | Fresh build, dependency/security review, explicit publication boundary | NOT RUN |

Tests may use temporary app-owned fixtures, but must never execute code from a cloned project. Mocks establish application handling, not real OS permission/disk/UI behavior. Keep mocked fault tests and real platform checks distinguishable.
