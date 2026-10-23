"use client";

import { DIMENSIONS, MODE_KEYS, MODES, type Dimension, type Mode } from "@/lib/interview/coach";
import type { SessionSummary } from "./history";

const DIMS = Object.keys(DIMENSIONS) as Dimension[];
const DAY = 86_400_000;

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
};
const modesLabel = (m: Mode[]) =>
  m.length === MODE_KEYS.length
    ? "Everything"
    : m
        .map((x) => MODES[x]?.label)
        .filter(Boolean)
        .join(", ");
const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Days in a row with at least one interview, counting back from today (or yesterday). */
function streak(sessions: SessionSummary[], now = Date.now()): number {
  const days = new Set(sessions.map((s) => dayKey(Date.parse(s.at))));
  let start = days.has(dayKey(now)) ? now : days.has(dayKey(now - DAY)) ? now - DAY : null;
  let n = 0;
  while (start != null && days.has(dayKey(start))) {
    n++;
    start -= DAY;
  }
  return n;
}

/** A small line of one skill's scores, oldest to newest. */
function Trend({ values }: { values: number[] }) {
  const w = 120;
  const h = 34;
  const pts = values.map((v, i) => [
    values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - 8) + 4,
    h - 4 - (v / 10) * (h - 8),
  ]);
  return (
    <svg className="iv-trend" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 3 : 1.8} />
      ))}
    </svg>
  );
}

export function ProgressPanel({
  sessions,
  synced,
  account,
  loading,
  onOpen,
}: {
  sessions: SessionSummary[];
  /** kept on the server for this session */
  synced: boolean;
  /** signed in to a real account (not a guest session) */
  account: boolean;
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  if (!sessions.length) return null;
  const best = Math.max(...sessions.map((s) => s.overall));
  const now = Date.now();
  const week = sessions.filter((s) => now - Date.parse(s.at) < 7 * DAY).length;
  const days = streak(sessions, now);
  // skills over time, oldest first, from sessions that kept their scores
  const scored = [...sessions].filter((s) => s.scores).reverse();
  const trends = DIMS.map((d) => {
    const values = scored.map((s) => s.scores![d] ?? 0);
    const last = values.at(-1) ?? 0;
    const prev = values.length > 1 ? values.at(-2)! : null;
    return { d, values, last, delta: prev == null ? null : Math.round((last - prev) * 10) / 10 };
  });

  return (
    <section className="iv-panel iv-progress" aria-labelledby="iv-hist-h">
      <div className="iv-progress-head">
        <div>
          <h2 id="iv-hist-h" className="iv-h">
            Your progress
          </h2>
          <p className="dim">
            {account && synced
              ? "Saved to your account, so it follows you to any device."
              : synced
                ? "Saved for this guest session. Sign in to keep your interviews on every device."
                : "Kept in this browser. Sign in to keep your interviews on every device."}
          </p>
        </div>
        <div className="iv-progress-kpis">
          <div>
            <strong>{sessions.length}</strong>
            <span>interviews</span>
          </div>
          <div>
            <strong>{best}</strong>
            <span>best score</span>
          </div>
          <div>
            <strong>{week}</strong>
            <span>this week</span>
          </div>
          <div className={days >= 2 ? "hot" : ""}>
            <strong>{days}</strong>
            <span>day streak</span>
          </div>
        </div>
      </div>

      {scored.length >= 1 && (
        <div className="iv-trends">
          <div className="iv-label">Skills over time</div>
          <div className="iv-trends-grid">
            {trends.map((t) => (
              <div key={t.d} className="iv-trend-card">
                <span>{DIMENSIONS[t.d]}</span>
                <div className="iv-trend-row">
                  <strong>{t.last}</strong>
                  {t.delta != null && t.delta !== 0 && (
                    <em className={t.delta > 0 ? "up" : "down"}>
                      {t.delta > 0 ? "▲" : "▼"} {Math.abs(t.delta)}
                    </em>
                  )}
                </div>
                <Trend values={t.values} />
              </div>
            ))}
          </div>
          <p className="dim iv-trends-note">
            Out of 10, oldest to newest; the arrow compares your last interview with the one before.
          </p>
        </div>
      )}

      <ul className="iv-hist" aria-busy={loading || undefined}>
        {sessions.slice(0, 12).map((s) => (
          <li key={s.id}>
            <div className="iv-hist-main">
              <span className="iv-hist-name">{s.projectName}</span>
              <span className="dim">
                <time dateTime={s.at}>{when(s.at)}</time>
                {modesLabel(s.modes) ? ` · ${modesLabel(s.modes)}` : ""}
              </span>
              {s.planTotal > 0 && (
                <span className="iv-hist-plan">
                  <span aria-hidden="true">
                    <i style={{ width: `${(s.planDone / s.planTotal) * 100}%` }} />
                  </span>
                  {s.planDone}/{s.planTotal} of plan done
                </span>
              )}
            </div>
            <strong className="iv-hist-score">{s.overall}</strong>
            {s.openable ? (
              <button type="button" className="btn sm iv-hist-open" onClick={() => onOpen(s.id)}>
                View feedback
              </button>
            ) : (
              <span
                className="dim iv-hist-none"
                title="This session finished before reports were saved"
              >
                Older session, report not saved
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
