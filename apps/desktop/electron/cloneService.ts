import { randomUUID } from "node:crypto";
import { lstat, mkdir, opendir, readFile, rename, rm, rmdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { CloneJob, CloneMode, ErrorCode } from "@atlas-nexus/types";
import type { NexusDatabase } from "@atlas-nexus/storage";
import { parseGitRemoteUrl } from "@atlas-nexus/validation";
import { validateWindowsFolderName } from "@atlas-nexus/security";
import { FolderService, FolderServiceError } from "./folderService.js";

export const CLONE_LIMITS = Object.freeze({
  concurrentJobs: 1,
  durationMs: 15 * 60_000,
  outputBytes: 1_000_000,
  files: 50_000,
  bytes: 2 * 1024 * 1024 * 1024,
  retainedJobs: 100,
  automaticRetries: 0
});

const gitConfig = [
  "-c", "http.sslBackend=openssl",
  "-c", "http.sslVerify=true",
  "-c", "http.followRedirects=false",
  "-c", "credential.helper=",
  "-c", "core.askPass=",
  "-c", "protocol.allow=never",
  "-c", "protocol.https.allow=always",
  "-c", "protocol.file.allow=never",
  "-c", "filter.lfs.smudge=",
  "-c", "filter.lfs.process=",
  "-c", "filter.lfs.required=false",
  "-c", "core.symlinks=false"
] as const;

export class CloneServiceError extends Error {
  constructor(readonly code: ErrorCode, message: string) { super(message); this.name = "CloneServiceError"; }
}

type GitOperation = "download" | "verification";

interface ActiveJob { controller: AbortController; process: ChildProcessWithoutNullStreams | null }

export class CloneService {
  private readonly active = new Map<string, ActiveJob>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly database: NexusDatabase, private readonly folders: FolderService) {}

  async initialize(): Promise<void> { await this.database.reconcileInterruptedCloneJobs(); }

  async shutdown(): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all([...this.active.entries()].map(async ([jobId, active]) => {
      active.controller.abort(); if (active.process) terminateOwnedProcess(active.process);
      const current = this.database.getCloneJob(jobId);
      if (current && ["Queued", "Validating", "Downloading", "Verifying"].includes(current.status)) {
        await this.database.updateCloneJob(jobId, { status: "Interrupted", phase: "Interrupted", progressPercent: null, errorCode: "INTERNAL_ERROR", errorMessage: "The application closed before this job completed.", completedAt: now });
      }
    }));
    await this.queue;
  }

  list(): CloneJob[] { return this.database.listCloneJobs(CLONE_LIMITS.retainedJobs); }

  get(jobId: string): CloneJob {
    const job = this.database.getCloneJob(jobId);
    if (!job) throw new CloneServiceError("INVALID_INPUT", "The clone job does not exist.");
    return job;
  }

  async start(input: { sourceUrl: string; mode: CloneMode; grantId: string; childName: string; retryOfJobId?: string }): Promise<CloneJob> {
    let source;
    try { source = parseGitRemoteUrl(input.sourceUrl); } catch (error) { throw new CloneServiceError("INVALID_INPUT", (error as Error).message); }
    const target = await this.folders.resolveCloneDestination(input.grantId, input.childName);
    const job = await this.database.createCloneJob({ id: randomUUID(), sourceUrl: source.normalizedUrl, provider: source.provider, namespace: source.namespace, repositoryName: source.repository, mode: input.mode, destinationPath: target.destinationPath, ...(input.retryOfJobId ? { retryOfJobId: input.retryOfJobId } : {}) });
    const controller = new AbortController();
    this.active.set(job.id, { controller, process: null });
    this.queue = this.queue.then(() => this.execute(job.id, input.grantId, input.childName, target.parentPath, target.destinationPath, controller.signal)).catch(() => undefined);
    return job;
  }

  async cancel(jobId: string): Promise<CloneJob> {
    const job = this.get(jobId);
    const active = this.active.get(jobId);
    if (!active || !["Queued", "Validating", "Downloading", "Verifying"].includes(job.status)) throw new CloneServiceError("INVALID_INPUT", "Only an active clone job can be cancelled.");
    active.controller.abort();
    if (active.process) terminateOwnedProcess(active.process);
    return this.database.updateCloneJob(jobId, { status: "Cancelled", phase: "Cancelled", progressPercent: null, errorCode: "CANCELLED", errorMessage: "Cancelled by the owner.", completedAt: new Date().toISOString() });
  }

  async retry(jobId: string, grantId: string, childName: string): Promise<CloneJob> {
    const previous = this.get(jobId);
    if (!["Failed", "Cancelled", "Interrupted", "Partial"].includes(previous.status)) throw new CloneServiceError("INVALID_INPUT", "Only an unsuccessful terminal job can be retried.");
    return this.start({ sourceUrl: previous.sourceUrl, mode: previous.mode, grantId, childName, retryOfJobId: jobId });
  }

  private async execute(jobId: string, grantId: string, childName: string, parentPath: string, destinationPath: string, signal: AbortSignal): Promise<void> {
    let stageRoot: string | null = null;
    try {
      if (signal.aborted) throw new CloneServiceError("CANCELLED", "Cancelled by the owner.");
      await this.database.updateCloneJob(jobId, { status: "Validating", phase: "Validating destination", startedAt: new Date().toISOString(), progressPercent: null });
      await this.folders.revalidateCloneDestination(grantId, childName, parentPath, destinationPath);
      stageRoot = path.join(parentPath, `.atlas-nexus-stage-${jobId}`);
      await mkdir(stageRoot, { recursive: false });
      await writeFile(path.join(stageRoot, ".atlas-nexus-owner.json"), JSON.stringify({ jobId, version: 1 }), { flag: "wx" });
      const payload = path.join(stageRoot, "payload");
      const job = this.get(jobId);
      await this.database.updateCloneJob(jobId, { status: "Downloading", phase: "Downloading", progressPercent: null });
      const commit = await this.download(jobId, job.mode, job.sourceUrl, payload, stageRoot, signal);
      if (signal.aborted) throw new CloneServiceError("CANCELLED", "Cancelled by the owner.");
      await this.database.updateCloneJob(jobId, { status: "Verifying", phase: "Verifying", progressPercent: null, resolvedCommit: commit });
      const verification = await this.verify(jobId, job.mode, payload, stageRoot, signal);
      await this.folders.revalidateCloneDestination(grantId, childName, parentPath, destinationPath);
      await rename(payload, destinationPath);
      await unlink(path.join(stageRoot, ".atlas-nexus-owner.json"));
      await rmdir(stageRoot);
      stageRoot = null;
      await this.database.updateCloneJob(jobId, { status: "Completed", phase: "Completed", progressPercent: 100, verificationSummary: verification, completedAt: new Date().toISOString(), errorCode: null, errorMessage: null });
    } catch (error) {
      const current = this.database.getCloneJob(jobId);
      const cancelled = signal.aborted || (error instanceof CloneServiceError && error.code === "CANCELLED") || current?.status === "Cancelled";
      if (!cancelled) {
        const mapped = mapCloneError(error);
        await this.database.updateCloneJob(jobId, { status: "Failed", phase: "Failed", progressPercent: null, errorCode: mapped.code, errorMessage: mapped.message, completedAt: new Date().toISOString() });
      }
    } finally {
      this.active.delete(jobId);
      if (stageRoot) await cleanupOwnedStage(stageRoot, jobId);
    }
  }

  private async download(jobId: string, mode: CloneMode, sourceUrl: string, payload: string, isolatedHome: string, signal: AbortSignal): Promise<string> {
    if (mode === "mirror") {
      await this.git(jobId, ["clone", "--mirror", "--no-recurse-submodules", "--", sourceUrl, payload], isolatedHome, signal, "download");
      return (await this.git(jobId, ["-C", payload, "rev-parse", "HEAD"], isolatedHome, signal, "verification")).trim();
    }
    const modeArgs = mode === "snapshot" ? ["--depth=1", "--single-branch", "--no-tags"] : [];
    await this.git(jobId, ["clone", "--no-checkout", "--no-recurse-submodules", ...modeArgs, "--", sourceUrl, payload], isolatedHome, signal, "download");
    const commit = (await this.git(jobId, ["-C", payload, "rev-parse", "HEAD"], isolatedHome, signal, "verification")).trim();
    const tree = await this.git(jobId, ["-C", payload, "ls-tree", "-rz", "--full-tree", commit], isolatedHome, signal, "verification");
    validateGitTree(tree);
    await this.git(jobId, ["-C", payload, "checkout", "--force", "HEAD", "--", "."], isolatedHome, signal, "verification");
    return commit;
  }

  private async verify(jobId: string, mode: CloneMode, payload: string, isolatedHome: string, signal: AbortSignal): Promise<string> {
    if (mode === "mirror") {
      const bare = (await this.git(jobId, ["-C", payload, "rev-parse", "--is-bare-repository"], isolatedHome, signal, "verification")).trim();
      if (bare !== "true") throw new CloneServiceError("VERIFICATION_FAILED", "The mirror did not produce a bare repository.");
      await this.git(jobId, ["-C", payload, "fsck", "--full", "--no-progress"], isolatedHome, signal, "verification");
      const refs = (await this.git(jobId, ["-C", payload, "for-each-ref", "--format=%(refname)"], isolatedHome, signal, "verification")).split(/\r?\n/).filter(Boolean).length;
      return `Bare mirror verified with ${refs} refs; external LFS assets and unreachable remote objects are not claimed.`;
    }
    await this.git(jobId, ["-C", payload, "fsck", "--full", "--no-progress"], isolatedHome, signal, "verification");
    const lfsPointers = await countLfsPointers(payload, 256);
    if (mode === "snapshot") await rm(path.join(payload, ".git"), { recursive: true, force: false });
    const totals = await inspectPayload(payload, CLONE_LIMITS.files, CLONE_LIMITS.bytes);
    const suffix = lfsPointers > 0 ? ` ${lfsPointers} possible LFS pointer file(s) remain unresolved.` : " No LFS pointer files were detected in the bounded scan.";
    return `${mode === "snapshot" ? "Source snapshot" : "Git working copy"} verified: ${totals.files} files, ${totals.bytes} bytes.${suffix} Submodules were not initialized.`;
  }

  private async git(jobId: string, args: string[], isolatedHome: string, signal: AbortSignal, operation: GitOperation): Promise<string> {
    return runGit([...gitConfig, "-c", `core.hooksPath=${path.join(isolatedHome, "disabled-hooks")}`, ...args], isolatedGitEnvironment(isolatedHome), signal, operation, process => {
      const active = this.active.get(jobId); if (active) active.process = process;
    });
  }
}

export function isolatedGitEnvironment(home: string): NodeJS.ProcessEnv {
  const keep = ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "ComSpec", "COMSPEC", "TEMP", "TMP", "WINDIR"];
  const env: NodeJS.ProcessEnv = {};
  for (const key of keep) if (process.env[key]) env[key] = process.env[key];
  return { ...env, HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: home, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_SYSTEM: "NUL", GIT_CONFIG_GLOBAL: "NUL", GIT_ATTR_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never", GIT_ASKPASS: "", SSH_ASKPASS: "", GIT_LFS_SKIP_SMUDGE: "1", GIT_ALLOW_PROTOCOL: "https" };
}

export function validateGitTree(output: string): void {
  const records = output.split("\0").filter(Boolean);
  if (records.length > CLONE_LIMITS.files) throw new CloneServiceError("RESOURCE_LIMIT", `The repository exceeds the ${CLONE_LIMITS.files}-file safety limit.`);
  for (const record of records) {
    const tab = record.indexOf("\t");
    if (tab < 0) throw new CloneServiceError("VERIFICATION_FAILED", "Git returned an invalid tree entry.");
    const metadata = record.slice(0, tab); const relative = record.slice(tab + 1);
    if (metadata.startsWith("120000 ")) throw new CloneServiceError("UNSUPPORTED_PATH", "Repository symlinks are not supported by the Stage 2 Windows safety policy.");
    for (const segment of relative.split("/")) validateWindowsFolderName(segment);
  }
}

export async function runIsolatedGitForTest(args: string[], isolatedHome: string, operation: GitOperation = "verification", signal = new AbortController().signal): Promise<string> {
  return runGit([...gitConfig, "-c", `core.hooksPath=${path.join(isolatedHome, "disabled-hooks")}`, ...args], isolatedGitEnvironment(isolatedHome), signal, operation, () => undefined);
}

async function runGit(args: string[], env: NodeJS.ProcessEnv, signal: AbortSignal, operation: GitOperation, onStart: (process: ChildProcessWithoutNullStreams) => void): Promise<string> {
  if (signal.aborted) throw new CloneServiceError("CANCELLED", "Cancelled by the owner.");
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { shell: false, windowsHide: true, env, stdio: "pipe" });
    onStart(child);
    let output = ""; let bytes = 0; let settled = false;
    const finish = (error?: Error): void => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener("abort", abort); error ? reject(error) : resolve(output); };
    const append = (chunk: Buffer): void => { bytes += chunk.length; if (bytes > CLONE_LIMITS.outputBytes) { terminateOwnedProcess(child); finish(new CloneServiceError("RESOURCE_LIMIT", "Git exceeded the diagnostic output safety limit.")); return; } output += chunk.toString("utf8"); };
    child.stdout.on("data", append); child.stderr.on("data", append);
    child.on("error", () => finish(new CloneServiceError("CLONE_UNAVAILABLE", "Git could not be started.")));
    child.on("close", code => { if (signal.aborted) finish(new CloneServiceError("CANCELLED", "Cancelled by the owner.")); else if (code !== 0) finish(classifyGitFailure(output, operation)); else finish(); });
    const abort = (): void => { terminateOwnedProcess(child); finish(new CloneServiceError("CANCELLED", "Cancelled by the owner.")); };
    signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => { terminateOwnedProcess(child); finish(new CloneServiceError("DOWNLOAD_TIMEOUT", "The clone exceeded the 15-minute safety limit.")); }, CLONE_LIMITS.durationMs);
  });
}

export function classifyGitFailure(output: string, operation: GitOperation): CloneServiceError {
  const normalized = output.toLowerCase();
  if (operation === "verification") return new CloneServiceError("VERIFICATION_FAILED", "The downloaded Git data could not be verified.");
  if (/too many requests|rate limit(?:ed| exceeded)?|http (?:error )?429|the requested url returned error: 429/.test(normalized)) return new CloneServiceError("RATE_LIMITED", "The repository provider temporarily refused the request because its rate limit was reached.");
  if (/the requested url returned error: 5\d\d|service unavailable|bad gateway|gateway timeout|captcha|anti-bot/.test(normalized)) return new CloneServiceError("PROVIDER_UNAVAILABLE", "The repository provider is unavailable or restricting anonymous Git access. Retry later.");
  if (/the requested url returned error: 403|remote:\s*(?:access denied|forbidden)/.test(normalized)) return new CloneServiceError("REPOSITORY_UNAVAILABLE", "The provider refused anonymous repository access. It may require authentication or restrict automated requests.");
  if (/authentication failed|permission denied|the requested url returned error: 401/.test(normalized)) return new CloneServiceError("PRIVATE_REPOSITORY", "The repository requires credentials or access that Atlas Nexus does not use.");
  if (/repository not found|not found|does not appear to be a git repository|could not read username|terminal prompts disabled/.test(normalized)) return new CloneServiceError("REPOSITORY_UNAVAILABLE", "The repository was not found, is private, or is unavailable.");
  if (/could not resolve host|failed to connect|connection (?:timed out|refused|reset)|ssl|tls|schannel|certificate|network is unreachable/.test(normalized)) return new CloneServiceError("TRANSPORT_ERROR", "The repository provider could not be reached securely.");
  return new CloneServiceError("NETWORK_ERROR", "The repository download failed before verification.");
}

function terminateOwnedProcess(child: ChildProcessWithoutNullStreams): void {
  if (!child.pid || child.killed) return;
  if (process.platform === "win32") spawn("taskkill.exe", ["/pid", String(child.pid), "/t", "/f"], { shell: false, windowsHide: true, stdio: "ignore" });
  else child.kill("SIGTERM");
}

export async function inspectPayload(root: string, maxFiles: number, maxBytes: number): Promise<{ files: number; bytes: number }> {
  const pending = [root]; let files = 0; let bytes = 0;
  while (pending.length) {
    const current = pending.pop()!; const directory = await opendir(current);
    for await (const entry of directory) {
      const target = path.join(current, entry.name); const info = await lstat(target);
      if (info.isSymbolicLink()) throw new CloneServiceError("UNSUPPORTED_PATH", "The downloaded tree contains a symbolic link or reparse point.");
      if (info.isDirectory()) pending.push(target); else if (info.isFile()) { files += 1; bytes += info.size; }
      if (files > maxFiles || bytes > maxBytes) throw new CloneServiceError("RESOURCE_LIMIT", "The downloaded repository exceeds the Stage 2 file or disk-usage limit.");
    }
  }
  return { files, bytes };
}

async function countLfsPointers(root: string, maximumReads: number): Promise<number> {
  const pending = [root]; let reads = 0; let pointers = 0;
  while (pending.length && reads < maximumReads) {
    const directory = await opendir(pending.pop()!);
    for await (const entry of directory) {
      if (entry.name === ".git") continue;
      const target = path.join(directory.path, entry.name); const info = await lstat(target);
      if (info.isDirectory()) pending.push(target);
      else if (info.isFile() && info.size <= 2048 && reads++ < maximumReads) {
        const content = await readFile(target, "utf8").catch(() => "");
        if (content.startsWith("version https://git-lfs.github.com/spec/v1\n")) pointers += 1;
      }
    }
  }
  return pointers;
}

export async function cleanupOwnedStage(stageRoot: string, jobId: string): Promise<void> {
  if (path.basename(stageRoot) !== `.atlas-nexus-stage-${jobId}`) return;
  try {
    const ledger = JSON.parse(await readFile(path.join(stageRoot, ".atlas-nexus-owner.json"), "utf8")) as { jobId?: string };
    if (ledger.jobId !== jobId) return;
    await rm(stageRoot, { recursive: true, force: false });
  } catch { /* fail closed: retain unproven data */ }
}

export function mapCloneError(error: unknown): CloneServiceError {
  if (error instanceof CloneServiceError) return error;
  if (error instanceof FolderServiceError) return new CloneServiceError(error.code, error.message);
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EEXIST" || code === "ENOTEMPTY") return new CloneServiceError("PATH_COLLISION", "The destination was created by another process before publication.");
  if (code === "EACCES" || code === "EPERM") return new CloneServiceError("PERMISSION_DENIED", "Windows denied a required filesystem operation.");
  if (code === "ENOSPC" || code === "EDQUOT") return new CloneServiceError("RESOURCE_LIMIT", "The destination does not have enough available storage.");
  return new CloneServiceError("INTERNAL_ERROR", "The clone could not be completed safely.");
}
