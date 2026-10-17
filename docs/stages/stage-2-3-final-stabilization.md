# ATLAS NEXUS — STAGE 2.3 FINAL STABILIZATION REPORT

## Decision

**PENDING NATIVE ACCEPTANCE.** The secure cloning implementation and exact-source automated checks pass, but mandatory owner-native lifecycle and production GUI evidence remains unavailable. Stage 2.5 publication planning and Stage 3 implementation are not authorized by this result.

## Identity and scope

- Workspace: `D:\newl\ATLAS-NEXUS-OWNER`
- Branch: `codex/stage2-secure-clone-engine`
- Initial HEAD: `474794f9a7c2c74a736a5ebed5e77ad9000245a0`
- Final stabilization commit: recorded in the final handoff after verification
- Owner profile: `C:\Users\susib\AppData\Roaming\@atlas-nexus\desktop\nexus.sqlite`
- Profile SHA-256 before/after read-only inspection: `06F7CBABDD5FBEC7B766DD7A78D9DD31C93E5C848479156341E67D2A8A047865`
- Owner profile at inspection: 14 Completed and 9 Failed jobs; 13 distinct provider/mode combinations
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
| GitLab | Independently inspected owner artifact PASS | Automated exact-source PASS; owner-native NOT RUN | Independently inspected owner artifact PASS |
| Codeberg | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS; earlier failure retained |
| Gitea.com | Automated exact-source/API-blob PASS; owner-native NOT RUN | Independently inspected owner artifacts PASS (two jobs) | Independently inspected owner artifact PASS |
| Forgejo Next | Independently inspected owner artifact PASS | Independently inspected owner artifact PASS; dotfiles Full regression also PASS | Independently inspected owner artifact PASS |

Exact owner URLs, job IDs, destinations, commits, summaries, and timestamps remain in [the evidence reconciliation](../testing/stage-2-3-evidence-reconciliation-2026-10-17.md).

### Missing-mode automated evidence

- GitLab Full: isolated job `b34ce6a0-f0d0-4b9a-b52c-ef0278a7c1a3`; commit `f963375e70b279adbaae80faff6cbc6836417f62`; non-bare working tree; 117 files/1194032 bytes; completed `2026-10-17T08:04:11.377Z`.
- Gitea.com Snapshot: isolated job `a86435fc-86de-498b-9630-46fd043ec21f`; commit `1a5a8445c1e2175e0283e6c90284cc7e1a3d2fc5`; no final `.git`; 29/29 paths and Git blob IDs matched; 199406 bytes; completed `2026-10-17T08:04:33.743Z`.

Both used temporary test destinations removed by bounded test cleanup. They were not written into the owner profile and therefore do not establish owner-native Clone Manager acceptance.

## Lifecycle and production results

| Check | Automated/integration | Owner-native |
| --- | --- | --- |
| Active cancellation | PASS; active job remains Cancelled and no destination publishes | NOT RUN |
| Explicit retry | PASS; predecessor preserved and new job records retry lineage | NOT RUN |
| Restart persistence | PASS; terminal metadata survives close/reopen | NOT RUN |
| Interruption recovery | PASS; shutdown records Interrupted with no completion/auto-retry | NOT RUN |
| Collision preservation | PASS; foreign marker remains byte-identical | NOT RUN |
| Production CSP/build | PASS automated; built preview policy is restrictive | GUI render/clone/open-destination NOT RUN |
| Clean shutdown | Service shutdown PASS automated | Production window shutdown NOT RUN |
| Real permission denial | Synthetic mapping PASS | NOT RUN |
| Real disk-full/quota | Synthetic mapping PASS | NOT RUN |

The Windows automation connector exposed no controllable Atlas Nexus native window while an owner instance was already running. A second instance was not started against the same profile. No native PASS is inferred.

## Security verification

Electron sandbox, context isolation, disabled Node integration, restricted IPC, strict production CSP, HTTPS-only approved hosts, TLS verification, isolated credentials/config, disabled hooks/filters/LFS smudge/submodule recursion, path validation, reparse protection, staging ownership, cancellation, resource limits, and collision-safe publication remain enabled. No raw Git stderr is returned to the renderer.

## Remaining warnings and owner procedure

- Native GitLab Full and Gitea.com Snapshot must still be performed through the UI with fresh child names.
- Native cancellation, two-step retry, restart/interruption, collision, production clone/open-destination, and clean shutdown remain pending.
- Real ACL-denied and disk-full/quota scenarios remain NOT RUN by design.
- Forgejo Next is a changeable test service.
- `module.register()` deprecation and the renderer chunk-size warning are noncritical tooling warnings.

Follow [Stage 2 owner Windows acceptance](../testing/stage-2-owner-acceptance.md). Do not reuse or delete successful destinations and do not reset the profile database.
