import { createPool, type Db } from "./client";

/** Shared pool for the web app (survives dev hot reloads). */
const g = globalThis as unknown as { __osxPool?: Db };

export function getPool(): Db {
  if (!g.__osxPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__osxPool = createPool(url);
  }
  return g.__osxPool;
}
