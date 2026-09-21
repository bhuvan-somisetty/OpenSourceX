import { describe, expect, it } from "vitest";
import { createPool, migrate } from "./index";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("migrations from an empty database", () => {
  it("apply in order on a fresh database, are idempotent, and create the expected tables", async () => {
    const admin = createPool(url!);
    const name = `osx_migtest_${process.pid}`;
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
    await admin.query(`CREATE DATABASE ${name}`);
    const fresh = createPool(url!.replace(/\/[^/?]+(\?|$)/, `/${name}$1`));
    try {
      const ran = await migrate(fresh);
      expect(ran).toEqual([
        "001_foundation.sql",
        "002_m1a_domain.sql",
        "003_sync_state.sql",
        "004_organization_tags.sql",
        "005_saved_items.sql",
      ]);
      expect(await migrate(fresh)).toEqual([]);
      const t = (
        await fresh.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
        )
      ).rows.map((r) => r.table_name);
      for (const need of [
        "source_snapshot",
        "provenance_record",
        "participation",
        "mentorship_project",
        "sync_state",
        "quarantine",
        "freshness_policy",
        "provenance_freshness",
      ]) {
        expect(t).toContain(need);
      }
      const contact = await fresh.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND column_name ~* '(e-?mail|lfid|lf_id|phone|mobile)'",
      );
      expect(contact.rows).toEqual([]);
    } finally {
      await fresh.end();
      await admin.query(`DROP DATABASE IF EXISTS ${name}`);
      await admin.end();
    }
  });
});
