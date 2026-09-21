import { readFile } from "node:fs/promises";
import { createPool, migrate } from "@opensourcex/database";
import { loadEnv, requireDatabaseUrl } from "@opensourcex/shared";
import { fixtureFile, type SnapshotEnvelope } from "@opensourcex/providers";
import { runSpike } from "./pipeline";

/** M1a: run the pipeline over recorded, sanitized snapshots only. Never touches live sources. */
const files = [
  "gsoc-2025-orgs-sample.json",
  "lfx-projects-sample.json",
  "cncf-lfx-export-2026-t3.json",
];
const envelopes = await Promise.all(
  files.map(async (f) => JSON.parse(await readFile(fixtureFile(f), "utf8")) as SnapshotEnvelope),
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
