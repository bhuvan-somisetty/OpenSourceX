import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPool, migrate } from "./index";

const url = process.env.DATABASE_URL;
const pool = url ? createPool(url) : undefined;

describe.skipIf(!pool)("schema guard", () => {
  beforeAll(async () => {
    await migrate(pool!);
  });
  afterAll(() => pool?.end());

  it("migrations are idempotent", async () => {
    expect(await migrate(pool!)).toEqual([]);
  });

  it("no column may hold contact data (DATA_POLICY.md)", async () => {
    const { rows } = await pool!.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema='public' AND column_name ~* '(e-?mail|lfid|lf_id|phone|mobile)'`,
    );
    expect(rows).toEqual([]);
  });
});
