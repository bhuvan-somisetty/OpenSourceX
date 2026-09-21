import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createPool, migrate } from "@opensourcex/database";
import { fixtureFile, type SnapshotEnvelope } from "@opensourcex/providers";
import { runSpike } from "./pipeline";

const url = process.env.DATABASE_URL;
const pool = url ? createPool(url) : undefined;
const load = (f: string) => JSON.parse(readFileSync(fixtureFile(f), "utf8")) as SnapshotEnvelope;
const fixtures = () => [
  load("gsoc-2025-orgs-sample.json"),
  load("lfx-projects-sample.json"),
  load("cncf-lfx-export-2026-t3.json"),
];

const TABLES =
  "entity_revision, conflict, entity_link, person_role, person, mentorship_project_term, mentorship_project, participation, external_identifier, organization, term_alias, program_term, program_year, program_ecosystem, program, sync_run, provenance_record, source_snapshot, source_dataset, source_provider";
const count = async (t: string) =>
  Number((await pool!.query(`SELECT count(*) FROM ${t}`)).rows[0].count);

describe.skipIf(!pool)("M1a pipeline (recorded, sanitized snapshots)", () => {
  beforeAll(async () => {
    await migrate(pool!);
  });
  beforeEach(async () => {
    await pool!.query(`TRUNCATE ${TABLES} RESTART IDENTITY CASCADE`);
  });
  afterAll(() => pool?.end());

  it("loads all three sources with provenance", async () => {
    const r = await runSpike(pool!, fixtures());
    expect(r.failures).toEqual([]);
    expect(r.counts).toMatchObject({
      organizations: 3,
      participation: 3,
      mentorshipProjects: 3,
      snapshots: 3,
    });
    expect(r.counts.mentors).toBeGreaterThan(0);
    expect(r.counts.conflicts).toBe(0);
    // every claim row carries provenance
    for (const t of [
      "organization",
      "participation",
      "mentorship_project",
      "mentorship_project_term",
      "person",
      "person_role",
    ]) {
      const { rows } = await pool!.query(`SELECT count(*) FROM ${t} WHERE provenance_id IS NULL`);
      expect(Number(rows[0].count)).toBe(0);
    }
    // CNCF is an ecosystem inside LFX: only the 3 CNCF-listed offerings carry it
    const eco = await pool!.query(
      "SELECT count(*) FROM mentorship_project WHERE ecosystem_id IS NOT NULL",
    );
    expect(Number(eco.rows[0].count)).toBe(3);
  });

  it("GSoC stays organization/year: no project-level participation exists or can be inserted", async () => {
    await runSpike(pool!, fixtures());
    const g = await pool!.query("SELECT DISTINCT granularity FROM participation");
    expect(g.rows).toEqual([{ granularity: "organization_year" }]);
    await expect(
      pool!.query(
        `INSERT INTO participation(program_year_id,organization_id,granularity,status,provenance_id)
         SELECT program_year_id,organization_id,'project_term','CONFIRMED',provenance_id FROM participation LIMIT 1`,
      ),
    ).rejects.toThrow(/check/i);
  });

  it("is idempotent: a re-run adds nothing and creates no revisions", async () => {
    await runSpike(pool!, fixtures());
    const before = await Promise.all(
      [
        "organization",
        "participation",
        "mentorship_project",
        "person",
        "person_role",
        "program_term",
        "entity_link",
        "provenance_record",
      ].map(count),
    );
    const again = await runSpike(pool!, fixtures());
    const after = await Promise.all(
      [
        "organization",
        "participation",
        "mentorship_project",
        "person",
        "person_role",
        "program_term",
        "entity_link",
        "provenance_record",
      ].map(count),
    );
    expect(again.failures).toEqual([]);
    expect(after).toEqual(before);
    expect(again.counts).toMatchObject({
      organizations: 0,
      mentorshipProjects: 0,
      revisions: 0,
      conflicts: 0,
    });
  });

  it("stores no email or LFID anywhere in the database", async () => {
    await runSpike(pool!, fixtures());
    const tables = (
      await pool!.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
      )
    ).rows;
    for (const { table_name } of tables) {
      const { rows } = await pool!.query(
        `SELECT coalesce(string_agg(row_to_json(t)::text, ' '), '') AS blob FROM ${table_name} t`,
      );
      expect(rows[0].blob, table_name).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
      expect(rows[0].blob, table_name).not.toMatch(/"lfid"/i);
    }
  });

  it("rejects a snapshot containing contact data and stores nothing (fail closed)", async () => {
    const cncf = load("cncf-lfx-export-2026-t3.json");
    // DEVELOPMENT FIXTURE: planted contact data on a synthetic address (reserved .invalid TLD)
    (cncf.body as { programs: { title: string }[] }).programs[0]!.title +=
      " planted.person@example.invalid";
    const r = await runSpike(pool!, [cncf]);
    expect(r.failures[0]?.error).toMatch(/Contact data/);
    expect(await count("source_snapshot")).toBe(0);
    expect(await count("person")).toBe(0);
  });

  it("refuses live persistence for providers that are not approved", async () => {
    const live = { ...load("gsoc-2025-orgs-sample.json"), origin: "live" as const };
    const r = await runSpike(pool!, [live]);
    expect(r.failures[0]?.error).toMatch(/not allowed/);
    expect(await count("source_snapshot")).toBe(0);
  });

  it("isolates a failing source from the others", async () => {
    const bad = { ...load("gsoc-2025-orgs-sample.json"), fetchedAt: "not-a-date" };
    const r = await runSpike(pool!, [bad, load("lfx-projects-sample.json")]);
    expect(r.failures).toHaveLength(1);
    expect(r.counts.mentorshipProjects).toBe(3);
  });

  it("preserves history when upstream data changes", async () => {
    await runSpike(pool!, fixtures());
    const lfx = structuredClone(load("lfx-projects-sample.json")) as SnapshotEnvelope<{
      projects: { title: string }[];
    }>;
    const oldTitle = lfx.body.projects[0]!.title;
    lfx.body.projects[0]!.title = oldTitle + " (renamed)";
    lfx.fetchedAt = new Date(Date.parse(lfx.fetchedAt) + 86_400_000).toISOString();
    const r = await runSpike(pool!, [lfx]);
    expect(r.counts.revisions).toBe(1);
    const rev = await pool!.query(
      "SELECT changed_fields FROM entity_revision WHERE entity_type='mentorship_project'",
    );
    expect(rev.rows[0].changed_fields.title.old).toBe(oldTitle);
    expect(await count("source_snapshot")).toBe(4); // old snapshot kept alongside the new one
  });

  it("derives terms from dates and keeps the raw spelling", async () => {
    await runSpike(pool!, fixtures());
    const { rows } = await pool!.query(
      `SELECT t.raw_term_name, t.norm_status, p.year, p.term_code FROM mentorship_project_term t JOIN program_term p ON p.id=t.program_term_id LIMIT 1`,
    );
    expect(rows[0]).toMatchObject({
      raw_term_name: "2026 Term 3 (Sep-Nov)",
      norm_status: "CONFIRMED",
      year: 2026,
      term_code: "T3",
    });
  });
});
