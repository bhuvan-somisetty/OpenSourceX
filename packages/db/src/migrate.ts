import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./client";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = path.join(here, "..", "migrations");

/** Forward-only SQL migrations, applied in filename order, one transaction each. */
export async function migrate(pool: Db): Promise<string[]> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migration (
       name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = new Set(
    (await pool.query("SELECT name FROM schema_migration")).rows.map((r) => r.name),
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const ran: string[] = [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, f), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migration(name) VALUES ($1)", [f]);
      await client.query("COMMIT");
      ran.push(f);
    } catch (e) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${f} failed: ${(e as Error).message}`, { cause: e });
    } finally {
      client.release();
    }
  }
  return ran;
}
