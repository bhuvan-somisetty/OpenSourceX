"use client";

import type {
  Feedback,
  InterviewProject,
  Level,
  Mode,
  Report,
  Scores,
  Turn,
} from "@/lib/interview/coach";

/**
 * Interview history. Every finished interview is kept in this browser and, for anyone with a
 * session, in their account too, so it can be opened on any device. The account copy wins when
 * both exist; browser-only sessions are uploaded once a session is available.
 */
export type Engine = "ai" | "offline";

/** A retried answer to one question, kept beside the first attempt. */
export interface Retry {
  answer: string;
  at: string;
  feedback: Feedback;
}

export type SavedTurn = Turn & { retry?: Retry };

export interface SavedReport {
  project: InterviewProject;
  turns: SavedTurn[];
  report: Report;
  modes: Mode[];
  level: Level;
  engine: Engine;
}

export interface SessionSummary {
  id: string;
  at: string;
  projectName: string;
  modes: Mode[];
  level?: string;
  overall: number;
  scores: Scores | null;
  planDone: number;
  planTotal: number;
  /** a full report can be opened (kept here or in the account) */
  openable: boolean;
  /** stored in the account */
  synced: boolean;
  shared: boolean;
}

const HISTORY_KEY = "osx.interview.history.v1";
const REPORTS_KEY = "osx.interview.reports.v1";
const PLAN_KEY = "osx.interview.plan.v1";
const KEEP = 12;

interface LocalEntry {
  at: string;
  id?: string;
  project: string;
  mode?: Mode;
  modes?: Mode[];
  overall: number;
}

const readJson = <T>(key: string, fallback: T): T => {
  try {
    return (JSON.parse(localStorage.getItem(key) ?? "null") as T) ?? fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

export const newSessionId = (at: string) => `${at}-${Math.random().toString(36).slice(2, 8)}`;

export const planTotalOf = (r: Report) => r.focus.reduce((n, f) => n + f.actions.length, 0);

/* ----------------------------- this browser ----------------------------- */

export function localReport(id: string): SavedReport | null {
  return readJson<Record<string, SavedReport>>(REPORTS_KEY, {})[id] ?? null;
}

export function localPlan(id: string | null | undefined): Record<string, boolean> {
  if (!id) return {};
  return readJson<Record<string, Record<string, boolean>>>(PLAN_KEY, {})[id] ?? {};
}

function keepLocal(id: string, saved: SavedReport, at: string) {
  const entries = [
    {
      at,
      id,
      project: saved.project.name,
      modes: saved.modes,
      overall: saved.report.overall,
    },
    ...readJson<LocalEntry[]>(HISTORY_KEY, []).filter((h) => h.id !== id),
  ].slice(0, KEEP);
  writeJson(HISTORY_KEY, entries);
  const all = readJson<Record<string, SavedReport>>(REPORTS_KEY, {});
  all[id] = saved;
  let ids = entries.flatMap((h) => (h.id && all[h.id] ? [h.id] : []));
  // the oldest reports go first if the browser runs out of space
  while (ids.length && !writeJson(REPORTS_KEY, Object.fromEntries(ids.map((k) => [k, all[k]]))))
    ids = ids.slice(0, -1);
}

function localSummaries(): SessionSummary[] {
  return readJson<LocalEntry[]>(HISTORY_KEY, []).map((h) => {
    const saved = h.id ? localReport(h.id) : null;
    const plan = localPlan(h.id);
    return {
      id: h.id ?? `legacy-${h.at}`,
      at: h.at,
      projectName: h.project,
      modes: h.modes ?? (h.mode ? [h.mode] : []),
      level: saved?.level,
      overall: h.overall,
      scores: saved?.report.scores ?? null,
      planDone: Object.values(plan).filter(Boolean).length,
      planTotal: saved ? planTotalOf(saved.report) : 0,
      openable: !!saved,
      synced: false,
      shared: false,
    };
  });
}

/* ------------------------------ the account ----------------------------- */

const api = (path = "") => `/api/v1/interview/sessions${path}`;
const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

interface ServerSummary {
  id: string;
  at: string;
  projectName: string;
  modes: Mode[];
  level: string;
  overall: number;
  scores: Scores | null;
  planDone: number;
  planTotal: number;
  shared: boolean;
}

async function upload(id: string, at: string, saved: SavedReport): Promise<boolean> {
  try {
    const res = await fetch(
      api(),
      jsonInit("POST", {
        id,
        at,
        projectName: saved.project.name,
        modes: saved.modes,
        level: saved.level,
        engine: saved.engine,
        overall: saved.report.overall,
        data: { project: saved.project, report: saved.report, turns: saved.turns },
        plan: localPlan(id),
      }),
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Saves a finished interview here and, when possible, in the account. */
export async function saveSession(id: string, at: string, saved: SavedReport): Promise<boolean> {
  keepLocal(id, saved, at);
  return upload(id, at, saved);
}

/**
 * Every past interview, newest first: the account's, plus any kept only in this browser (which
 * are uploaded on the way, so the next device sees them). `signedIn` is false when there is no
 * session to keep them in.
 */
export async function loadHistory(): Promise<{ sessions: SessionSummary[]; signedIn: boolean }> {
  const local = localSummaries();
  let server: ServerSummary[] | null = null;
  try {
    const res = await fetch(api(), { cache: "no-store" });
    if (res.ok) server = ((await res.json()) as { sessions: ServerSummary[] }).sessions;
  } catch {
    server = null;
  }
  if (!server) return { sessions: local, signedIn: false };

  const onServer = new Set(server.map((s) => s.id));
  const missing = local.filter((l) => l.openable && !onServer.has(l.id));
  const uploaded = await Promise.all(
    missing.map((l) => upload(l.id, l.at, localReport(l.id)!).then((ok) => (ok ? l.id : null))),
  );
  const nowSynced = new Set(uploaded.filter(Boolean) as string[]);
  const merged: SessionSummary[] = [
    ...server.map((s) => ({ ...s, openable: true, synced: true })),
    ...local.filter((l) => !onServer.has(l.id)).map((l) => ({ ...l, synced: nowSynced.has(l.id) })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return { sessions: merged, signedIn: true };
}

/** The full report of a past interview, from this browser or the account. */
export async function openSession(id: string): Promise<SavedReport | null> {
  try {
    const res = await fetch(api(`/${encodeURIComponent(id)}`), { cache: "no-store" });
    if (res.ok) {
      const { session } = (await res.json()) as {
        session: {
          modes: Mode[];
          level: Level;
          engine: Engine;
          plan: Record<string, boolean>;
          data: { project: InterviewProject; report: Report; turns: SavedTurn[] };
        };
      };
      // the account's plan ticks are the latest
      const all = readJson<Record<string, Record<string, boolean>>>(PLAN_KEY, {});
      all[id] = session.plan ?? {};
      writeJson(PLAN_KEY, all);
      return {
        project: session.data.project,
        report: session.data.report,
        turns: session.data.turns,
        modes: session.modes,
        level: session.level,
        engine: session.engine,
      };
    }
  } catch {
    /* fall back to this browser */
  }
  return localReport(id);
}

let planTimer: ReturnType<typeof setTimeout> | null = null;

/** Practice plan ticks: kept here at once, sent to the account a moment later. */
export function savePlan(id: string, plan: Record<string, boolean>) {
  const all = readJson<Record<string, Record<string, boolean>>>(PLAN_KEY, {});
  all[id] = plan;
  writeJson(PLAN_KEY, all);
  if (planTimer) clearTimeout(planTimer);
  planTimer = setTimeout(() => {
    void fetch(api(`/${encodeURIComponent(id)}`), jsonInit("PATCH", { plan })).catch(() => {});
  }, 600);
}

/** Keeps a retried answer with the interview, here and in the account. */
export function saveRetry(id: string, index: number, retry: Retry) {
  const all = readJson<Record<string, SavedReport>>(REPORTS_KEY, {});
  const saved = all[id];
  if (saved?.turns[index]) {
    saved.turns[index] = { ...saved.turns[index]!, retry };
    writeJson(REPORTS_KEY, all);
  }
  void fetch(
    api(`/${encodeURIComponent(id)}`),
    jsonInit("PATCH", { retry: { index, ...retry } }),
  ).catch(() => {});
}

/** Turns the share link on (returns its path) or off; null when it could not be done. */
export async function setShare(id: string, on: boolean): Promise<string | null | false> {
  try {
    const res = await fetch(api(`/${encodeURIComponent(id)}`), jsonInit("PATCH", { share: on }));
    if (!res.ok) return false;
    return ((await res.json()) as { shareUrl: string | null }).shareUrl;
  } catch {
    return false;
  }
}
