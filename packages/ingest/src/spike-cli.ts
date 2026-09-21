import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPool, migrate } from "@opensourcex/db";
import { loadEnv, requireDatabaseUrl } from "@opensourcex/shared";
import type { SnapshotEnvelope } from "@opensourcex/providers";
import { runSpike } from "./pipeline";

/** M1a: run the pipeline over recorded, sanitized snapshots only. Never touches live sources. */
const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "providers",
  "fixtures",
);
const files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
const envelopes = await Promise.all(
  files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), "utf8")) as SnapshotEnvelope),
);

const pool = createPool(requireDatabaseUrl(loadEnv()));
try {
  await migrate(pool);
  const result = await runSpike(pool, envelopes);
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length) process.exitCode = 1;
} finally {
  await pool.end();
}
