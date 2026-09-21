import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  addSaved,
  createPool,
  ensureUser,
  listSaved,
  migrate,
  removeSavedByEntity,
  removeSavedById,
  savedKeys,
} from "./index";

const url = process.env.DATABASE_URL;
const pool = url ? createPool(url) : undefined;

describe.skipIf(!pool)("saved items", () => {
  beforeAll(async () => {
    await migrate(pool!);
  });
  beforeEach(async () => {
    await pool!.query("TRUNCATE saved_item, app_user CASCADE");
    await ensureUser(pool!, "u1", "Development User", "development");
    await ensureUser(pool!, "u2", "Other", "development");
  });
  afterAll(() => pool?.end());

  it("saves once: the same item cannot be saved twice", async () => {
    const a = await addSaved(pool!, "u1", "PROJECT", "mp-1", "lfx-mentorship");
    const b = await addSaved(pool!, "u1", "PROJECT", "mp-1", "lfx-mentorship");
    expect(b.id).toBe(a.id);
    expect(await listSaved(pool!, "u1")).toHaveLength(1);
  });

  it("is per user and type", async () => {
    await addSaved(pool!, "u1", "PROJECT", "x", null);
    await addSaved(pool!, "u1", "ORGANIZATION", "x", null);
    await addSaved(pool!, "u2", "PROJECT", "x", null);
    expect(await listSaved(pool!, "u1")).toHaveLength(2);
    expect([...(await savedKeys(pool!, "u2"))]).toEqual(["PROJECT:x"]);
  });

  it("unsaves by id and by entity, and never touches another user", async () => {
    const a = await addSaved(pool!, "u1", "REPOSITORY", "https://github.com/a/b", null);
    await addSaved(pool!, "u2", "REPOSITORY", "https://github.com/a/b", null);
    expect(await removeSavedById(pool!, "u2", a.id)).toBe(false); // not theirs
    expect(await removeSavedByEntity(pool!, "u1", "REPOSITORY", "https://github.com/a/b")).toBe(
      true,
    );
    expect(await listSaved(pool!, "u1")).toHaveLength(0);
    expect(await listSaved(pool!, "u2")).toHaveLength(1);
  });

  it("rejects an unknown entity type at the database", async () => {
    await expect(
      pool!.query(
        "INSERT INTO saved_item(user_id, entity_type, entity_id) VALUES ('u1','BOGUS','x')",
      ),
    ).rejects.toThrow(/check/i);
  });
});
