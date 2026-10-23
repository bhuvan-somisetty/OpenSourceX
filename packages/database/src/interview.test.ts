import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { INTERVIEW_MIGRATION, INTERVIEW_MIGRATION_SQL } from "./interview";
import { MIGRATIONS_DIR } from "./migrate";

describe("interview sessions table", () => {
  it("creates the table with exactly the SQL of its migration", async () => {
    const file = await readFile(path.join(MIGRATIONS_DIR, INTERVIEW_MIGRATION), "utf8");
    expect(INTERVIEW_MIGRATION_SQL.replace(/\r\n/g, "\n")).toBe(file.replace(/\r\n/g, "\n"));
  });
});
