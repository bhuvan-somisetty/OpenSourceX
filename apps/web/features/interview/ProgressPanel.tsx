"use client";

import { MODE_KEYS, MODES, type Mode } from "@/lib/interview/coach";
import type { SessionSummary } from "./history";

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
            <span>{sessions.length === 1 ? "interview" : "interviews"}</span>
          </div>
        </div>
      </div>

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
