import { getPool, type Db } from "@opensourcex/database";
import { loadEnv } from "@opensourcex/shared";

/** Server-side data access for pages. Pages never write SQL; they call @opensourcex/database queries. */
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

export function db(): Db {
  return getPool();
}

export async function load<T>(fn: (d: Db) => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn(db()) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return {
      ok: false,
      error: /ECONNREFUSED|DATABASE_URL|connect|does not exist/i.test(msg) ? "database" : msg,
    };
  }
}

export function dataMode() {
  const env = loadEnv();
  return {
    mode: env.DATA_MODE,
    liveSources: env.INGESTION_LIVE_SOURCES,
    aiEnabled: env.AI_ENABLED,
  };
}
