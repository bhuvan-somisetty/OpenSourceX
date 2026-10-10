import pg from "pg";

export type Db = pg.Pool;

export function createPool(connectionString: string): Db {
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    statement_timeout: 30_000,
    connectionTimeoutMillis: 3_000,
  });
  pool.on("error", () => {
    /* prevent unhandled error event from crashing the process when database is offline */
  });
  return pool;
}

/** Run `fn` in a transaction; rolls back on error. */
export async function withTx<T>(pool: Db, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
