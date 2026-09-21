import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPool, migrate } from "@opensourcex/db";
import type { SnapshotEnvelope } from "@opensourcex/providers";
import { runSpike } from "./pipeline";

const url = process.env.DATABASE_URL;
const pool = url ? createPool(url) : undefined;
const dir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "providers",
  "fixtures",
);
const load = (f: string) => JSON.parse(readFileSync(path.join(dir, f), "utf8")) as SnapshotEnvelope;
const gsoc = () => load("gsoc-2025-orgs-sample.json");
const lfx = () => load("lfx-projects-sample.json");

const one = async (sql: string, args: unknown[] = []) => (await pool!.query(sql, args)).rows[0];

describe.skipIf(!pool)("sync state, circuit breaker, quarantine, freshness", () => {
  beforeAll(async () => {
    await migrate(pool!);
  });
  beforeEach(async () => {
    await pool!.query(
      "TRUNCATE external_identifier, source_dataset, source_provider, program CASCADE",
    );
  });
  afterAll(() => pool?.end());

  it("records sync state and seeds freshness policy on success", async () => {
    const r = await runSpike(pool!, [gsoc()]);
    expect(r.failures).toEqual([]);
    const st = await one(
      "SELECT s.* FROM sync_state s JOIN source_dataset d ON d.id=s.dataset_id WHERE d.key='gsoc-orgs'",
    );
    expect(st.consecutive_failures).toBe(0);
    expect(st.last_success_at).not.toBeNull();
    expect(st.source_shape_hash).toBeTruthy();
    expect(
      (await one("SELECT max_age_days FROM freshness_policy WHERE dataset_key='lfx-projects'"))
        .max_age_days,
    ).toBe(7);
  });

  it("derives STALE from age and policy at read time (never stored)", async () => {
    await runSpike(pool!, [lfx()]);
    await pool!.query("UPDATE provenance_record SET last_verified_at = now() - interval '60 days'");
    const stale = await one("SELECT count(*) FROM provenance_freshness WHERE freshness='stale'");
    expect(Number(stale.count)).toBeGreaterThan(0);
    await pool!.query("UPDATE provenance_record SET last_verified_at = now()");
    expect(
      Number(
        (await one("SELECT count(*) FROM provenance_freshness WHERE freshness='stale'")).count,
      ),
    ).toBe(0);
  });

  it("opens a circuit after repeated failures, blocks the source, then recovers", async () => {
    const t0 = new Date("2026-10-01T00:00:00Z");
    const bad = { ...gsoc(), fetchedAt: "not-a-date" };
    for (let i = 0; i < 3; i++) await runSpike(pool!, [bad], { now: t0 });
    const blocked = await runSpike(pool!, [gsoc()], { now: new Date(t0.getTime() + 60_000) });
    expect(blocked.failures[0]?.error).toMatch(/circuit open/);
    expect(Number((await one("SELECT count(*) FROM source_snapshot")).count)).toBe(0);
    const later = await runSpike(pool!, [gsoc()], { now: new Date(t0.getTime() + 16 * 60_000) });
    expect(later.failures).toEqual([]);
    expect((await one("SELECT consecutive_failures FROM sync_state")).consecutive_failures).toBe(0);
  });

  it("quarantines a batch whose structure changed and keeps the last good data", async () => {
    await runSpike(pool!, [gsoc(), lfx()]);
    const orgsBefore = Number((await one("SELECT count(*) FROM organization")).count);
    const drift = gsoc() as SnapshotEnvelope<{ orgs: Record<string, unknown>[] }>;
    drift.body.orgs[0]!.surpriseField = "new upstream field";
    drift.fetchedAt = new Date(Date.parse(drift.fetchedAt) + 86_400_000).toISOString();
    const r = await runSpike(pool!, [drift, lfx()]);
    expect(r.failures).toHaveLength(1);
    expect(r.failures[0]?.error).toMatch(/schema drift/);
    expect(Number((await one("SELECT count(*) FROM quarantine")).count)).toBe(1);
    expect(Number((await one("SELECT count(*) FROM organization")).count)).toBe(orgsBefore);
    // quarantine holds hashes and a reason, never payload
    expect(JSON.stringify(await one("SELECT * FROM quarantine"))).not.toMatch(
      /surpriseField|new upstream/,
    );
  });

  it("a failing source does not change another source's state", async () => {
    await runSpike(pool!, [lfx()]);
    await runSpike(pool!, [{ ...gsoc(), fetchedAt: "bad" }]);
    const rows = (
      await pool!.query(
        "SELECT d.key, s.consecutive_failures FROM sync_state s JOIN source_dataset d ON d.id=s.dataset_id ORDER BY d.key",
      )
    ).rows;
    expect(rows).toEqual([
      { key: "gsoc-orgs", consecutive_failures: 1 },
      { key: "lfx-projects", consecutive_failures: 0 },
    ]);
  });
});
