import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import type { AppSettings, ThemePreference } from "@atlas-nexus/types";

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
  }
] as const;

export class NexusDatabase {
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
    await this.persist();
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
    this.database.run("INSERT INTO app_settings(key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at", [key, value, new Date().toISOString()]);
    await this.persist();
    return this.getSettings();
  }

  schemaVersion(): number { return Number(this.database.exec("SELECT MAX(version) FROM schema_migrations")[0]?.values[0]?.[0] ?? 0); }
  tableIsEmpty(table: "repositories" | "clone_jobs"): boolean { return Number(this.database.exec(`SELECT COUNT(*) FROM ${table}`)[0]?.values[0]?.[0] ?? 0) === 0; }

  async close(): Promise<void> { await this.persist(); this.database.close(); }

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
