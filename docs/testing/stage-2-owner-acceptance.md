# Stage 2 owner Windows acceptance

Use a normal, non-administrator Windows 11 session. Do not reuse, rename, overwrite, or delete the successful Snapshot, Full Clone, or Mirror destinations. Do not delete or replace the existing Atlas Nexus SQLite database. Create a fresh disposable parent through the application picker and use unique child names containing the current date/time.

Record each result as PASS, FAIL, or NOT RUN with the application mode, source URL, exact disposable destination, visible final status, timestamp, and any safe error code/message. A screenshot establishes visible state only; record the interaction performed as text. Do not include credentials or private paths that should not be published.

## A. Active cancellation and confirmed retry

1. Start development mode with `npm.cmd run dev` and choose a sufficiently long-running public repository that is safe and approved by the owner.
2. Confirm the job visibly reaches Downloading. Select Cancel while it is active.
3. Expected: status becomes Cancelled, the UI says it was not completed, no full/green 100% progress bar appears, no final destination exists, and unrelated sibling hashes remain unchanged.
4. Select Review retry. Expected: no network operation starts yet.
5. Select Confirm retry using a new unique child name if the previous name is unavailable.
6. Expected: the new job records `retryOfJobId`, reaches Completed only after verification, and the previous Cancelled record remains unchanged.

## B. History and interruption persistence

1. With completed, failed, and cancelled records visible, close Atlas Nexus normally and relaunch development mode.
2. Expected: all records and their statuses remain; unsuccessful records do not display successful progress.
3. Start a disposable job, wait for Downloading, then close Atlas Nexus normally.
4. Relaunch without manually editing the database or staging directory.
5. Expected: the unfinished job is Interrupted, progress is not 100%, and no download restarts automatically.

## C. Production-mode clone and destination opening

1. Close development mode and its server. Run `npm.cmd run build`, then `npm.cmd start`.
2. Using a new disposable child, perform one small public GitHub Snapshot or Full Clone.
3. Expected: production CSP remains restrictive; the job completes after verification; Open destination opens the exact new child; no downloaded source is executed.
4. Inspect DevTools and available diagnostics for CSP, preload, renderer, Git, and uncaught errors. Record warnings separately from failures.

## D. Clean shutdown

1. Close the production application while idle. Expected: clean exit without a remaining Atlas Nexus window.
2. Relaunch, start another disposable job, wait for Downloading, and close normally.
3. Expected after relaunch: the job is Interrupted, no automatic retry occurs, and no owned Git process continues downloading.

## E. Remaining G06 native faults

Only perform these with owner-approved disposable locations. Do not change ACLs on existing user data and do not intentionally fill a normal working drive.

- Disconnect networking before a new disposable clone. Expected: Failed with a transport-safe message, no final destination, no successful progress.
- Use an already-known, safely disposable location that naturally denies writes. Expected: Permission denied, no ACL changes, no final destination.
- Use a safely constrained disposable test volume if one already exists. Expected: resource-limit/disk-full failure without unrelated deletion. Otherwise record NOT RUN.
- Create the final child concurrently after preview but before publication. Expected: Path collision and preservation of the foreign child and its marker hash.

Stop on any overwrite, unexpected code execution, credential prompt, security-control regression, or mismatch between status and filesystem result. Preserve the evidence and report Stage 2 NO-GO for investigation.
