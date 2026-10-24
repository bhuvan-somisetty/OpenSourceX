"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LfxAnnouncement } from "@/lib/lfx-announce";
import {
  daysUntil,
  find,
  fmtDay,
  fmtRange,
  milestones,
  officialUrl,
  parseTimeline,
  rowStates,
  toIcs,
} from "@/lib/lfx-timeline";

const termName = (t: { year: number; termCode: string }) => `${t.year} Term ${t.termCode.slice(1)}`;

const STATE_LABEL = { done: "Done", now: "Now", next: "Next", later: "" } as const;

/** "18:00 UTC" shown in the viewer's own time zone as well */
function localTime(day: string, time: string) {
  const d = new Date(`${day}T${time.padStart(5, "0")}:00Z`);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A live notice on the LFX page for the next term (or the running one). Tapping it opens the
 * whole official timetable as a card: countdowns, key dates, every row, where to start.
 */
export function LfxTermNotice({ data }: { data: LfxAnnouncement }) {
  const { term, busiest } = data;
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => parseTimeline(term), [term]);
  const apply = find(rows, /applications? open/i);
  const name = termName(term);

  return (
    <>
      <button
        type="button"
        className="lfxn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        data-testid="lfx-term-notice"
      >
        <span className="lfxn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
            />
          </svg>
          <i className="lfxn-dot" />
        </span>
        <span className="lfxn-text">
          <span className="lfxn-tag">New</span>
          <b>{name} dates are out</b>
          <span className="lfxn-sub">
            {apply?.start ? `Applications open ${fmtDay(apply.start)}` : "Official timeline"}
            {term.startsOn ? ` · Mentorship ${fmtRange(term.startsOn, term.endsOn)}` : ""}
          </span>
        </span>
        <span className="lfxn-go">
          See the timetable
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 12h14m-6-6 6 6-6 6"
            />
          </svg>
        </span>
      </button>
      {open && (
        <TermCard data={data} rows={rows} onClose={() => setOpen(false)} busiest={busiest} />
      )}
    </>
  );
}

function TermCard({
  data,
  rows,
  busiest,
  onClose,
}: {
  data: LfxAnnouncement;
  rows: ReturnType<typeof parseTimeline>;
  busiest: LfxAnnouncement["busiest"];
  onClose: () => void;
}) {
  const { term } = data;
  const today = new Date().toISOString().slice(0, 10);
  const states = rowStates(rows, today);
  const keys = milestones(term, rows);
  const apply = find(rows, /applications? open/i);
  const card = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // keep Tab inside the card
      if (e.key === "Tab" && card.current) {
        const f = card.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);

  const counts = [
    apply?.start && daysUntil(apply.start, today) > 0
      ? {
          n: daysUntil(apply.start, today),
          label: "days until applications open",
          at: fmtDay(apply.start, true),
        }
      : apply?.end && daysUntil(apply.end, today) >= 0
        ? {
            n: daysUntil(apply.end, today),
            label: "days left to apply",
            at: `closes ${fmtDay(apply.end, true)}`,
          }
        : null,
    term.startsOn && daysUntil(term.startsOn, today) > 0
      ? {
          n: daysUntil(term.startsOn, today),
          label: "days until mentorship starts",
          at: fmtDay(term.startsOn, true),
        }
      : term.endsOn && daysUntil(term.endsOn, today) >= 0
        ? {
            n: daysUntil(term.endsOn, today),
            label: "days left in the term",
            at: `ends ${fmtDay(term.endsOn, true)}`,
          }
        : null,
    { n: 3, label: "months, full time and paid", at: "remote, with CNCF maintainers" },
  ].filter(Boolean) as { n: number; label: string; at: string }[];

  const weeks = apply?.start ? Math.max(0, Math.round(daysUntil(apply.start, today) / 7)) : 0;

  const download = () => {
    const url = URL.createObjectURL(new Blob([toIcs(term, rows)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lfx-${term.year}-term-${term.termCode.slice(1)}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div
      className="lfxm-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={card}
        className="lfxm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lfxm-title"
        data-testid="lfx-term-card"
      >
        <button
          ref={closeBtn}
          type="button"
          className="lfxm-x"
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              d="M6 6l12 12M18 6 6 18"
            />
          </svg>
        </button>

        <header className="lfxm-head">
          <div className="lfxm-eyebrow">LFX Mentorship · official dates</div>
          <h2 id="lfxm-title">
            {term.year} <span className="lfxm-hl">Term {term.termCode.slice(1)}</span>
          </h2>
          <p>
            {term.startsOn && term.endsOn
              ? `${fmtDay(term.startsOn)} – ${fmtDay(term.endsOn, true)}`
              : term.label}
            {" · "}a paid, three-month remote mentorship on CNCF projects
          </p>
        </header>

        <div className="lfxm-counts">
          {counts.map((c) => (
            <div key={c.label} className="lfxm-count">
              <b>{c.n}</b>
              <span>{c.label}</span>
              <em>{c.at}</em>
            </div>
          ))}
        </div>

        <div className="lfxm-keys">
          {keys.map((k, i) => {
            const st =
              k.start && (k.end ?? k.start) < today
                ? "done"
                : k.start && k.start <= today
                  ? "now"
                  : "";
            return (
              <div key={k.key} className={`lfxm-key ${st && `lfxm-key-${st}`}`}>
                <span className="lfxm-key-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="lfxm-key-l">{k.label}</span>
                <b>{fmtRange(k.start, k.end)}</b>
              </div>
            );
          })}
        </div>

        <section className="lfxm-section" aria-labelledby="lfxm-tt">
          <h3 id="lfxm-tt">Full timetable</h3>
          <ol className="lfxm-tl">
            {rows.map((r, i) => (
              <li key={r.activity} className={`lfxm-row lfxm-${states[i]}`}>
                <span className="lfxm-dot" aria-hidden="true" />
                <div className="lfxm-when">
                  <b>{fmtRange(r.start, r.end) || r.dates}</b>
                  {r.endTime && r.end && <span>{r.endTime} UTC</span>}
                </div>
                <div className="lfxm-what">
                  <b>{r.activity}</b>
                  {r.endTime && r.end && (
                    <span suppressHydrationWarning>Your time: {localTime(r.end, r.endTime)}</span>
                  )}
                  {r.tbd && <span>Times to be announced, with several time zones</span>}
                  {r.note && !r.tbd && <span>{r.note}</span>}
                </div>
                {STATE_LABEL[states[i]!] && (
                  <span className={`lfxm-state lfxm-state-${states[i]}`}>
                    {STATE_LABEL[states[i]!]}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {busiest.length > 0 && (
          <section className="lfxm-section" aria-labelledby="lfxm-start">
            <h3 id="lfxm-start">Where to start</h3>
            <p className="lfxm-hint">
              CNCF projects with the most LFX mentorship projects in the last five terms. More past
              projects usually means more slots.
              {weeks > 1 &&
                ` Applications open in about ${weeks} weeks: a few merged pull requests by then help, as mentors look at them.`}
            </p>
            <div className="lfxm-busy">
              {busiest.map((b, i) => {
                const inner = (
                  <>
                    <span className="lfxm-busy-rank">{i + 1}</span>
                    <span className="lfxm-busy-name">{b.name}</span>
                    <span className="lfxm-busy-n">{b.projects}</span>
                  </>
                );
                return b.slug ? (
                  <Link
                    key={b.name}
                    href={`/programs/lfx/organizations/${b.slug}`}
                    className="lfxm-busy-item"
                  >
                    {inner}
                  </Link>
                ) : (
                  <span key={b.name} className="lfxm-busy-item">
                    {inner}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        <footer className="lfxm-foot">
          <button type="button" className="lfxm-btn lfxm-primary" onClick={download}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
              />
            </svg>
            Add to calendar
          </button>
          <a
            className="lfxm-btn"
            href={officialUrl(term.sourceUrl)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Official timeline ↗
          </a>
          <Link className="lfxm-btn" href="/ask" onClick={onClose}>
            Ask about this term
          </Link>
          <span className="lfxm-src">Source: cncf/mentoring on GitHub (CC BY 4.0)</span>
        </footer>
      </div>
    </div>
  );
}
