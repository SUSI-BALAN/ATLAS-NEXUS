import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type { AppSettings, CloneJob, CloneJobStatus, CloneMode, ErrorCode, GitProvider, ThemePreference } from "@atlas-nexus/types";

const require = createRequire(import.meta.url);

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS preferred_folders (id TEXT PRIMARY KEY, path TEXT NOT NULL UNIQUE, label TEXT NOT NULL, created_at TEXT NOT NULL, last_used_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS repositories (id TEXT PRIMARY KEY, provider TEXT NOT NULL, owner TEXT NOT NULL, name TEXT NOT NULL, canonical_url TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS clone_jobs (id TEXT PRIMARY KEY, repository_id TEXT, source_url TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('snapshot','full','mirror')), destination_path TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Queued','Validating','Downloading','Verifying','Completed','Partial','Failed','Cancelled','Interrupted')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY(repository_id) REFERENCES repositories(id));
    `
  },
  {
    version: 2,
    sql: `
      ALTER TABLE clone_jobs ADD COLUMN phase TEXT NOT NULL DEFAULT 'Queued';
      ALTER TABLE clone_jobs ADD COLUMN progress_percent INTEGER;
      ALTER TABLE clone_jobs ADD COLUMN resolved_commit TEXT;
      ALTER TABLE clone_jobs ADD COLUMN verification_summary TEXT;
      ALTER TABLE clone_jobs ADD COLUMN error_code TEXT;
      ALTER TABLE clone_jobs ADD COLUMN error_message TEXT;
      ALTER TABLE clone_jobs ADD COLUMN retry_of_job_id TEXT;
      ALTER TABLE clone_jobs ADD COLUMN started_at TEXT;
      ALTER TABLE clone_jobs ADD COLUMN completed_at TEXT;
      CREATE INDEX IF NOT EXISTS clone_jobs_updated_at_idx ON clone_jobs(updated_at DESC);
    `
  },
  {
    version: 3,
    sql: `
      UPDATE clone_jobs SET progress_percent = NULL WHERE status IN ('Partial','Failed','Cancelled','Interrupted');
      UPDATE clone_jobs SET progress_percent = 100 WHERE status = 'Completed';
    `
  },
  {
    version: 4,
    sql: `
      ALTER TABLE clone_jobs ADD COLUMN provider TEXT;
      ALTER TABLE clone_jobs ADD COLUMN namespace TEXT;
      ALTER TABLE clone_jobs ADD COLUMN repository_name TEXT;
      UPDATE clone_jobs SET provider = 'github' WHERE provider IS NULL AND source_url LIKE 'https://github.com/%';
    `
  }
] as const;

type CloneJobInsert = Pick<CloneJob, "id" | "sourceUrl" | "provider" | "namespace" | "repositoryName" | "mode" | "destinationPath"> & { retryOfJobId?: string | null };
type CloneJobUpdate = Partial<Pick<CloneJob, "status" | "phase" | "progressPercent" | "resolvedCommit" | "verificationSummary" | "errorCode" | "errorMessage" | "startedAt" | "completedAt">>;

export class NexusDatabase {
  private writeQueue: Promise<void> = Promise.resolve();
  private constructor(private readonly database: Database, readonly filePath: string) {}

  static async open(filePath: string, wasmPath?: string): Promise<NexusDatabase> {
    const locate = wasmPath ?? require.resolve("sql.js/dist/sql-wasm.wasm");
    const SQL: SqlJsStatic = await initSqlJs({ locateFile: () => locate });
    let bytes: Uint8Array | undefined;
    const backupPath = `${filePath}.backup`;
    try { bytes = new Uint8Array(await readFile(filePath)); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      try { bytes = new Uint8Array(await readFile(backupPath)); } catch (backupError) { if ((backupError as NodeJS.ErrnoException).code !== "ENOENT") throw backupError; }
    }
    const instance = new NexusDatabase(bytes ? new SQL.Database(bytes) : new SQL.Database(), filePath);
    instance.database.run("PRAGMA foreign_keys = ON;");
    await instance.migrate();
    return instance;
  }

  private async migrate(): Promise<void> {
    this.database.run("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);");
    const rows = this.database.exec("SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations");
    const current = Number(rows[0]?.values[0]?.[0] ?? 0);
    for (const migration of migrations) {
      if (migration.version <= current) continue;
      this.database.run("BEGIN IMMEDIATE;");
      try {
        this.database.run(migration.sql);
        this.database.run("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)", [migration.version, new Date().toISOString()]);
        this.database.run("COMMIT;");
      } catch (error) { this.database.run("ROLLBACK;"); throw error; }
    }
    this.backfillLegacyCloneSources();
    await this.persist();
  }

  private backfillLegacyCloneSources(): void {
    const statement = this.database.prepare("SELECT id, source_url FROM clone_jobs WHERE provider IS NULL OR namespace IS NULL OR repository_name IS NULL");
    const rows: Array<{ id: string; sourceUrl: string }> = [];
    try { while (statement.step()) { const row = statement.getAsObject(); rows.push({ id: String(row.id), sourceUrl: String(row.source_url) }); } } finally { statement.free(); }
    for (const row of rows) {
      const parsed = parseStoredSource(row.sourceUrl);
      if (parsed) this.database.run("UPDATE clone_jobs SET provider=?, namespace=?, repository_name=? WHERE id=?", [parsed.provider, parsed.namespace, parsed.repository, row.id]);
    }
  }

  getSettings(): AppSettings {
    const statement = this.database.prepare("SELECT key, value FROM app_settings WHERE key IN ('theme', 'preferredFolderPath')");
    const values = new Map<string, string>();
    try { while (statement.step()) { const row = statement.getAsObject() as { key: string; value: string }; values.set(row.key, row.value); } } finally { statement.free(); }
    const candidate = values.get("theme");
    const theme: ThemePreference = candidate === "dark" || candidate === "light" ? candidate : "system";
    return { theme, preferredFolderPath: values.get("preferredFolderPath") ?? null };
  }

  async setSetting(key: "theme" | "preferredFolderPath", value: string): Promise<AppSettings> {
    return this.serialize(async () => {
      this.database.run("INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [key, value, new Date().toISOString()]);
      await this.persist(); return this.getSettings();
    });
  }

  async createCloneJob(input: CloneJobInsert): Promise<CloneJob> {
    return this.serialize(async () => {
      const now = new Date().toISOString();
      this.database.run(`INSERT INTO clone_jobs(id, source_url, provider, namespace, repository_name, mode, destination_path, status, phase, retry_of_job_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Queued', 'Queued', ?, ?, ?)`, [input.id, input.sourceUrl, input.provider, input.namespace, input.repositoryName, input.mode, input.destinationPath, input.retryOfJobId ?? null, now, now]);
      await this.persist(); return this.getCloneJob(input.id)!;
    });
  }

  async updateCloneJob(id: string, update: CloneJobUpdate): Promise<CloneJob> {
    return this.serialize(async () => {
      const current = this.getCloneJob(id);
      if (!current) throw new Error("Clone job was not found.");
      if (update.status && update.status !== current.status && !legalTransitions[current.status].includes(update.status)) throw new Error(`Illegal clone job transition: ${current.status} -> ${update.status}`);
      const nextStatus = update.status ?? current.status;
      const normalizedUpdate = nextStatus === "Completed" ? { ...update, progressPercent: 100 } : ["Partial", "Failed", "Cancelled", "Interrupted"].includes(nextStatus) ? { ...update, progressPercent: null } : update;
      const next = { ...current, ...normalizedUpdate, updatedAt: new Date().toISOString() };
      this.database.run(`UPDATE clone_jobs SET status=?, phase=?, progress_percent=?, resolved_commit=?, verification_summary=?, error_code=?, error_message=?, started_at=?, completed_at=?, updated_at=? WHERE id=?`,
        [next.status, next.phase, next.progressPercent, next.resolvedCommit, next.verificationSummary, next.errorCode, next.errorMessage, next.startedAt, next.completedAt, next.updatedAt, id]);
      await this.persist(); return this.getCloneJob(id)!;
    });
  }

  getCloneJob(id: string): CloneJob | null {
    const statement = this.database.prepare("SELECT * FROM clone_jobs WHERE id = ?");
    try { statement.bind([id]); return statement.step() ? mapCloneJob(statement.getAsObject()) : null; } finally { statement.free(); }
  }

  listCloneJobs(limit = 100): CloneJob[] {
    const statement = this.database.prepare("SELECT * FROM clone_jobs ORDER BY updated_at DESC LIMIT ?");
    const jobs: CloneJob[] = [];
    try { statement.bind([Math.max(1, Math.min(limit, 500))]); while (statement.step()) jobs.push(mapCloneJob(statement.getAsObject())); } finally { statement.free(); }
    return jobs;
  }

  async reconcileInterruptedCloneJobs(): Promise<number> {
    const active: CloneJobStatus[] = ["Queued", "Validating", "Downloading", "Verifying"];
    const placeholders = active.map(() => "?").join(",");
    const count = Number(this.database.exec(`SELECT COUNT(*) FROM clone_jobs WHERE status IN (${placeholders})`, active)[0]?.values[0]?.[0] ?? 0);
    if (count === 0) return 0;
    const now = new Date().toISOString();
    return this.serialize(async () => {
      this.database.run(`UPDATE clone_jobs SET status='Interrupted', phase='Interrupted', progress_percent=NULL, error_code='INTERNAL_ERROR', error_message='The application closed before this job completed. Retry requires confirmation.', completed_at=?, updated_at=? WHERE status IN (${placeholders})`, [now, now, ...active]);
      await this.persist(); return count;
    });
  }

  schemaVersion(): number { return Number(this.database.exec("SELECT MAX(version) FROM schema_migrations")[0]?.values[0]?.[0] ?? 0); }
  tableIsEmpty(table: "repositories" | "clone_jobs"): boolean { return Number(this.database.exec(`SELECT COUNT(*) FROM ${table}`)[0]?.values[0]?.[0] ?? 0) === 0; }

  async close(): Promise<void> { await this.writeQueue; await this.persist(); this.database.close(); }

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(operation, operation);
    this.writeQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporary = `${this.filePath}.tmp`;
    await writeFile(temporary, this.database.export(), { flag: "w" });
    try { await rename(temporary, this.filePath); } catch (error) {
      if (process.platform !== "win32" || !["EEXIST", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      const backup = `${this.filePath}.backup`;
      await unlink(backup).catch(unlinkError => { if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") throw unlinkError; });
      await rename(this.filePath, backup);
      try { await rename(temporary, this.filePath); await unlink(backup); } catch (replacementError) {
        await rename(backup, this.filePath).catch(() => undefined);
        throw replacementError;
      }
    }
  }
}

const legalTransitions: Record<CloneJobStatus, CloneJobStatus[]> = {
  Queued: ["Validating", "Cancelled", "Interrupted", "Failed"],
  Validating: ["Downloading", "Cancelled", "Interrupted", "Failed"],
  Downloading: ["Verifying", "Cancelled", "Interrupted", "Failed"],
  Verifying: ["Completed", "Partial", "Cancelled", "Interrupted", "Failed"],
  Completed: [], Partial: [], Failed: [], Cancelled: [], Interrupted: []
};

function mapCloneJob(row: Record<string, unknown>): CloneJob {
  const text = (key: string): string => String(row[key] ?? "");
  const nullable = (key: string): string | null => row[key] === null || row[key] === undefined ? null : String(row[key]);
  return {
    id: text("id"), sourceUrl: text("source_url"), provider: (nullable("provider") ?? "github") as GitProvider,
    namespace: nullable("namespace") ?? inferLegacySource(text("source_url")).namespace,
    repositoryName: nullable("repository_name") ?? inferLegacySource(text("source_url")).repository,
    mode: text("mode") as CloneMode, destinationPath: text("destination_path"),
    status: text("status") as CloneJobStatus, phase: text("phase"), progressPercent: row.progress_percent === null || row.progress_percent === undefined ? null : Number(row.progress_percent),
    resolvedCommit: nullable("resolved_commit"), verificationSummary: nullable("verification_summary"), errorCode: nullable("error_code") as ErrorCode | null,
    errorMessage: nullable("error_message"), retryOfJobId: nullable("retry_of_job_id"), createdAt: text("created_at"), updatedAt: text("updated_at"),
    startedAt: nullable("started_at"), completedAt: nullable("completed_at")
  };
}

function inferLegacySource(sourceUrl: string): { namespace: string; repository: string } {
  const parts = sourceUrl.replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").split("/");
  return { namespace: parts[0] ?? "unknown", repository: parts[1] ?? "unknown" };
}

function parseStoredSource(sourceUrl: string): { provider: GitProvider; namespace: string; repository: string } | null {
  try {
    const url = new URL(sourceUrl); const hosts: Record<string, GitProvider> = { "github.com": "github", "gitlab.com": "gitlab", "codeberg.org": "codeberg", "gitea.com": "gitea", "v15.next.forgejo.org": "forgejo" };
    const provider = hosts[url.hostname.toLowerCase()]; const parts = url.pathname.split("/").filter(Boolean);
    if (!provider || parts.length < 2) return null;
    return { provider, namespace: parts.slice(0, -1).join("/"), repository: parts.at(-1)!.replace(/\.git$/i, "") };
  } catch { return null; }
}
