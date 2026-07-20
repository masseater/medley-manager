import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

export function getDbPath(): string {
  return process.env.MEDLEY_DB ?? join(repoRoot, "data", "medley.db");
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const path = getDbPath();
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(readFileSync(join(here, "schema.sql"), "utf8"));
  migrate(db);
  return db;
}

/** 既存DBへの後方互換カラム追加 */
function migrate(db: Database.Database) {
  const ensureColumn = (table: string, column: string, ddl: string) => {
    const cols = db.pragma(`table_info(${table})`) as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  // comment = ユーザーが書くメモ（note はスプシ等のデータ由来の備考）
  ensureColumn("videos", "comment", "comment TEXT");
  ensureColumn("parts", "comment", "comment TEXT");
}
