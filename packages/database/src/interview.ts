import { randomBytes } from "node:crypto";
import type { Db } from "./client";

/**
 * Finished mock interviews per user. The report and answers are stored as the app produced them
 * (`data`); the columns beside it are what lists and charts need without reading the report.
 */
export interface InterviewSessionSummary {
  id: string;
  at: string;
  projectName: string;
  modes: string[];
  level: string;
  engine: "ai" | "offline";
  overall: number;
  /** the report's average scores per skill */
  scores: Record<string, number> | null;
  planDone: number;
  planTotal: number;
  shared: boolean;
}

export interface InterviewSessionRow extends InterviewSessionSummary {
  data: { project: unknown; report: unknown; turns: unknown[] };
  plan: Record<string, boolean>;
  shareToken: string | null;
}

export interface InterviewSessionInput {
  id: string;
  at?: string;
  projectName: string;
  modes: string[];
  level: string;
  engine: "ai" | "offline";
  overall: number;
  data: { project: unknown; report: unknown; turns: unknown[] };
  plan?: Record<string, boolean>;
}

export const INTERVIEW_MIGRATION = "011_interview_sessions.sql";
/** The migration's SQL, kept here too so a server bundle without .sql files can create the table. */
export const INTERVIEW_MIGRATION_SQL = `-- Interview practice: each finished mock interview with its report, so a signed-in user can open
-- it again on any device, follow their scores over time, tick off the practice plan and share it
-- by link. Holds only what the user typed or said in answers, never contact data.
CREATE TABLE IF NOT EXISTS interview_session (
  user_id text NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  id text NOT NULL CHECK (length(id) BETWEEN 8 AND 80),
  project_name text NOT NULL CHECK (length(project_name) BETWEEN 1 AND 300),
  modes text[] NOT NULL DEFAULT '{}',
  level text NOT NULL CHECK (length(level) <= 20),
  engine text NOT NULL DEFAULT 'offline' CHECK (engine IN ('ai','offline')),
  overall smallint NOT NULL CHECK (overall BETWEEN 0 AND 100),
  -- { project, report, turns }: the report exactly as shown, with any retried answers
  data jsonb NOT NULL CHECK (octet_length(data::text) <= 400000),
  -- practice plan ticks, keyed "<focus>-<action>"
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- set only while the user shares the report by link
  share_token text UNIQUE CHECK (share_token IS NULL OR length(share_token) BETWEEN 16 AND 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS interview_session_user_created
  ON interview_session (user_id, created_at DESC);
`;
let ready: Promise<void> | null = null;

/**
 * Production migrations are applied by hand; this table is created on first use if it is not
 * there yet, with the same idempotent SQL as its migration, recorded as applied.
 */
export function ensureInterviewTable(db: Db): Promise<void> {
  ready ??= (async () => {
    const { rows } = await db.query("SELECT to_regclass('public.interview_session') AS t");
    if (rows[0]?.t) return;
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      await client.query(INTERVIEW_MIGRATION_SQL);
      await client.query(
        `CREATE TABLE IF NOT EXISTS schema_migration (
           name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
      );
      await client.query(
        "INSERT INTO schema_migration(name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
        [INTERVIEW_MIGRATION],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}

const planTotal = (report: unknown) => {
  const focus = (report as { focus?: { actions?: unknown[] }[] } | null)?.focus;
  return Array.isArray(focus) ? focus.reduce((n, f) => n + (f.actions?.length ?? 0), 0) : 0;
};

const summary = (r: Record<string, unknown>): InterviewSessionSummary => {
  const plan = (r.plan as Record<string, boolean> | null) ?? {};
  return {
    id: r.id as string,
    at: new Date(r.created_at as string).toISOString(),
    projectName: r.project_name as string,
    modes: (r.modes as string[]) ?? [],
    level: r.level as string,
    engine: r.engine as "ai" | "offline",
    overall: Number(r.overall),
    scores: (r.scores as Record<string, number> | null) ?? null,
    planDone: Object.values(plan).filter(Boolean).length,
    planTotal: planTotal(r.report),
    shared: Boolean(r.share_token),
  };
};

const full = (r: Record<string, unknown>): InterviewSessionRow => ({
  ...summary({
    ...r,
    scores: (r.data as { report?: { scores?: unknown } })?.report?.scores,
    report: (r.data as { report?: unknown })?.report,
  }),
  data: r.data as InterviewSessionRow["data"],
  plan: (r.plan as Record<string, boolean>) ?? {},
  shareToken: (r.share_token as string | null) ?? null,
});

/** Saves a finished interview; saving the same id again replaces it (re-uploads are harmless). */
export async function saveInterview(db: Db, userId: string, s: InterviewSessionInput) {
  await ensureInterviewTable(db);
  await db.query(
    `INSERT INTO interview_session
       (user_id, id, project_name, modes, level, engine, overall, data, plan, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, now()))
     ON CONFLICT (user_id, id) DO UPDATE SET
       project_name = EXCLUDED.project_name, modes = EXCLUDED.modes, level = EXCLUDED.level,
       engine = EXCLUDED.engine, overall = EXCLUDED.overall, data = EXCLUDED.data,
       plan = interview_session.plan || EXCLUDED.plan, updated_at = now()`,
    [
      userId,
      s.id,
      s.projectName,
      s.modes,
      s.level,
      s.engine,
      Math.round(s.overall),
      JSON.stringify(s.data),
      JSON.stringify(s.plan ?? {}),
      s.at ?? null,
    ],
  );
}

export async function listInterviews(
  db: Db,
  userId: string,
  limit = 50,
): Promise<InterviewSessionSummary[]> {
  await ensureInterviewTable(db);
  const { rows } = await db.query(
    `SELECT id, created_at, project_name, modes, level, engine, overall, plan, share_token,
            data->'report'->'scores' AS scores, data->'report' AS report
     FROM interview_session WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.map(summary);
}

export async function getInterview(
  db: Db,
  userId: string,
  id: string,
): Promise<InterviewSessionRow | null> {
  await ensureInterviewTable(db);
  const { rows } = await db.query("SELECT * FROM interview_session WHERE user_id=$1 AND id=$2", [
    userId,
    id,
  ]);
  return rows[0] ? full(rows[0]) : null;
}

/** A report someone chose to share, read by its link token. */
export async function getSharedInterview(
  db: Db,
  token: string,
): Promise<InterviewSessionRow | null> {
  if (!/^[a-f0-9]{16,64}$/.test(token)) return null;
  await ensureInterviewTable(db);
  const { rows } = await db.query("SELECT * FROM interview_session WHERE share_token=$1", [token]);
  return rows[0] ? full(rows[0]) : null;
}

export async function updateInterviewPlan(
  db: Db,
  userId: string,
  id: string,
  plan: Record<string, boolean>,
): Promise<boolean> {
  await ensureInterviewTable(db);
  const { rowCount } = await db.query(
    "UPDATE interview_session SET plan=$3, updated_at=now() WHERE user_id=$1 AND id=$2",
    [userId, id, JSON.stringify(plan)],
  );
  return (rowCount ?? 0) > 0;
}

/** Stores a retried answer on one question of a saved interview. */
export async function setInterviewRetry(
  db: Db,
  userId: string,
  id: string,
  index: number,
  retry: unknown,
): Promise<boolean> {
  await ensureInterviewTable(db);
  const { rowCount } = await db.query(
    `UPDATE interview_session
       SET data = jsonb_set(data, ARRAY['turns', $3::text, 'retry'], $4::jsonb, true), updated_at = now()
     WHERE user_id=$1 AND id=$2 AND jsonb_array_length(data->'turns') > $3`,
    [userId, id, index, JSON.stringify(retry)],
  );
  return (rowCount ?? 0) > 0;
}

/** Turns link sharing on (returns the token) or off (returns null). */
export async function setInterviewShare(
  db: Db,
  userId: string,
  id: string,
  on: boolean,
): Promise<string | null | undefined> {
  await ensureInterviewTable(db);
  const token = on ? randomBytes(16).toString("hex") : null;
  const { rows } = await db.query(
    `UPDATE interview_session
       SET share_token = CASE WHEN $3::boolean THEN COALESCE(share_token, $4) ELSE NULL END,
           updated_at = now()
     WHERE user_id=$1 AND id=$2 RETURNING share_token`,
    [userId, id, on, token],
  );
  return rows[0] ? ((rows[0].share_token as string | null) ?? null) : undefined;
}

export async function deleteInterview(db: Db, userId: string, id: string): Promise<boolean> {
  await ensureInterviewTable(db);
  const { rowCount } = await db.query("DELETE FROM interview_session WHERE user_id=$1 AND id=$2", [
    userId,
    id,
  ]);
  return (rowCount ?? 0) > 0;
}
