# ATLAS NEXUS — STAGE 2.3 OFFICIAL SIGN-OFF REPORT

## Decision

**GO.** The secure cloning implementation, exact-source automated checks, 13 independently inspected provider/mode artifacts, and the owner's explicit native PASS report jointly satisfy the mandatory Stage 2.3 criteria. Remaining real ACL-denied, disk-full/quota and difficult native reparse-race cases are documented noncritical limitations. Publication, deployment and Stage 3 remain outside this sign-off.

## Identity and scope

- Workspace: `D:\newl\ATLAS-NEXUS-OWNER`
- Branch: `codex/stage2-secure-clone-engine`
- Initial HEAD: `474794f9a7c2c74a736a5ebed5e77ad9000245a0`
- Acceptance review started at: `7127c8e69e0804aef2f943922b74075363844541`
- Official sign-off documentation commit: recorded in the final handoff after verification
- Owner profile: `C:\Users\susib\AppData\Roaming\@atlas-nexus\desktop\nexus.sqlite`
- Profile SHA-256 before/after read-only inspection: `06F7CBABDD5FBEC7B766DD7A78D9DD31C93E5C848479156341E67D2A8A047865`
- Owner profile at sign-off inspection: 13 Completed and 9 Failed jobs; 13 distinct provider/mode combinations
- Protected `README_FOR_OWNER.md`, `evidence/`, SQLite data, completed downloads, and the original `D:\newl\ATLAS NEXUS` workspace were not modified.

## Established failure causes

1. **Forgejo Next `Jake/dusk`: confirmed application defect.** Required `git ls-tree` stdout for a roughly 19,490-entry tree was combined with stderr and charged to the 1 MB diagnostic cap. The fix separates structured stdout (16 MiB) from diagnostic stderr (1 MB), retains hard bounds, and suppresses routine clone/checkout progress with `--quiet`. The exact live regression reaches a terminal result without `DIAGNOSTIC_LIMIT`.
2. **Forgejo Next `regulad/dotfiles` Full: confirmed Windows staging-path defect.** The repository contains a 158-character relative path. Adding the UUID staging path exceeded legacy Git for Windows checkout handling although the final destination path was safe. Command-scoped `core.longpaths=true` fixes checkout; the exact Full operation then passed at `f15ee4ac927a40b47a426e36c762a18148452b6c`. Filename, symlink, reparse, and final-destination protections remain enforced.
3. **GitLab `antora-collector` Mirror: undetermined historical failure.** Job `accf2420-1296-49bb-8ccf-75569e8022d5` ran for about six milliseconds, stored only `INTERNAL_ERROR`, and left no destination, stage, commit, or diagnostic. It failed before meaningful transport, but the exact failing operation cannot be recovered. Future unexpected failures persist a safe stage label; the historical row is unchanged.
4. **Codeberg `poke` Mirror: preserved retry history.** Failed job `d73dc981-0ec8-4b49-ac15-7ed9fedeb6f1` remains Failed. Later job `eb2f096e-2165-4043-b9b4-2d051c435214` is a separate Completed retry with verified bare structure and commit `81c7ce936c96712c2d30814b9c06a227659e4565`.

## Fixes and hardening

- Separate bounded stdout and stderr collectors; no unbounded process output accumulation.
- Distinct safe categories for diagnostic limit, generic Git failure, disk-full/quota, and interruption.
- Phase-specific safe Git verification messages for revision, tree, checkout, integrity, structure, and refs.
- Safe failure-stage persistence for destination validation, staging, download, verification, publication, and finalization.
- Command-scoped Git for Windows long-path support; no global Git changes.
- Final Snapshot totals continue to describe published files after `.git` removal.
- Clone Manager displays the persisted job ID for safe UI-to-diagnostic correlation.
- Built preview selects the restrictive production CSP unless an actual development renderer URL exists.
- Added deterministic lifecycle tests for cancellation, explicit retry lineage, collision preservation, shutdown interruption, and restart persistence.
- Added gated exact-source live tests for GitLab Full, Gitea.com Snapshot/blob integrity, dotfiles Full, and dusk large-tree handling.

## Five-provider acceptance matrix

| Provider | Snapshot | Full | Mirror |
| --- | --- | --- | --- |
| GitHub | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS |
| GitLab | Independently inspected owner artifact PASS | Automated exact-source PASS + OWNER-REPORTED NATIVE PASS | Independently inspected owner artifact PASS |
| Codeberg | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS; earlier failure retained |
| Gitea.com | Automated exact-source/API-blob PASS + OWNER-REPORTED NATIVE PASS | Independently inspected owner artifacts PASS (two jobs) | Independently inspected owner artifact PASS |
| Forgejo Next | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS; dotfiles Full regression also PASS | Independently inspected owner artifact PASS |

Exact owner URLs, job IDs, destinations, commits, summaries, and timestamps remain in [the evidence reconciliation](../testing/stage-2-3-evidence-reconciliation-2026-10-17.md).

### Missing-mode automated evidence

- GitLab Full: isolated job `b34ce6a0-f0d0-4b9a-b52c-ef0278a7c1a3`; commit `f963375e70b279adbaae80faff6cbc6836417f62`; non-bare working tree; 117 files/1194032 bytes; completed `2026-10-17T08:04:11.377Z`.
- Gitea.com Snapshot: isolated job `a86435fc-86de-498b-9630-46fd043ec21f`; commit `1a5a8445c1e2175e0283e6c90284cc7e1a3d2fc5`; no final `.git`; 29/29 paths and Git blob IDs matched; 199406 bytes; completed `2026-10-17T08:04:33.743Z`.

Both used temporary test destinations removed by bounded test cleanup. The owner subsequently reported native PASS for both modes. The inspected profile contains no corresponding new row, so native job IDs, destinations, commits and timestamps remain unavailable and are not inferred from the isolated tests.

## Lifecycle and production results

| Check | Automated/integration | Owner-native |
| --- | --- | --- |
| Active cancellation | PASS; active job remains Cancelled and no destination publishes | OWNER-REPORTED PASS while visibly Downloading |
| Explicit retry | PASS; predecessor preserved and new job records retry lineage | OWNER-REPORTED PASS for Review retry and Confirm retry |
| Restart persistence | PASS; terminal metadata survives close/reopen | OWNER-REPORTED PASS for SQLite history after restart |
| Interruption recovery | PASS; shutdown records Interrupted with no completion/auto-retry | OWNER-REPORTED PASS during Downloading |
| Collision preservation | PASS; foreign marker remains byte-identical | OWNER-REPORTED PASS; existing destination rejected without overwrite |
| Production CSP/build | PASS automated; built preview policy is restrictive | OWNER-REPORTED PASS for restrictive-CSP production clone |
| Destination opening | IPC/path validation covered | OWNER-REPORTED PASS for expected folder |
| Clean shutdown | Service shutdown PASS automated | OWNER-REPORTED PASS; no unexpected owned subprocess reported |
| Real permission denial | Synthetic mapping PASS | NOT RUN |
| Real disk-full/quota | Synthetic mapping PASS | NOT RUN |

Native PASS classifications above come directly from the owner's final acceptance statement. They are not upgraded to independently inspected status. The current SQLite profile has no new correlating rows, which limits metadata provenance but does not negate the explicit owner report under the documented acceptance policy.

## Security verification

Electron sandbox, context isolation, disabled Node integration, restricted IPC, strict production CSP, HTTPS-only approved hosts, TLS verification, isolated credentials/config, disabled hooks/filters/LFS smudge/submodule recursion, path validation, reparse protection, staging ownership, cancellation, resource limits, and collision-safe publication remain enabled. No raw Git stderr is returned to the renderer.

## Final automated verification — 2026-10-17

| Command | Exit code | Result |
| --- | ---: | --- |
| `npm.cmd run typecheck` | 0 | PASS |
| `npm.cmd test` | 0 | PASS; 16 files passed, 3 skipped; 130 tests passed, 24 skipped |
| `npm.cmd run build` | 0 | PASS; main, preload and renderer built; bundled CommonJS preload verified at 1684 bytes |
| `npm.cmd run verify:preload` | 0 | PASS; bundled CommonJS preload verified at 1684 bytes |
| `npm.cmd audit --json` | 0 | PASS; 0 vulnerabilities across 299 dependencies |
| `git diff --check` | 0 | PASS |

The four exact Stage 2.3 provider regression tests are retained as the immediately preceding verified live baseline; they were not rerun during this documentation-only sign-off review.

## Remaining warnings and owner procedure

- Real ACL-denied and disk-full/quota scenarios remain NOT RUN by design.
- Difficult native reparse-point race scenarios remain NOT RUN; deterministic protections pass.
- Forgejo Next is a changeable test service.
- `module.register()` deprecation and the renderer chunk-size warning are noncritical tooling warnings.

Stage 2.3 is ready for separately authorized Stage 2.5 GitHub publication preparation. Do not reuse or delete successful destinations and do not reset the profile database.
