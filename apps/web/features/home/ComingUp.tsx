import Link from "next/link";
import { ProgramMark } from "@/components/ui/ProgramMark";
import type { Deadline } from "@/lib/home-insights";
import type { LfxAnnouncement } from "@/lib/lfx-announce";
import { daysUntil, find, parseTimeline } from "@/lib/lfx-timeline";
import { formatInfoDate } from "@/lib/program-info";

interface Item {
  key: string;
  label: string;
  slug: string;
  short: string;
  date: string;
  days: number;
  href: string;
}

/** a horizon for the closeness bar: a date 60 days out is an empty bar, today a full one */
const HORIZON = 60;

function ics(items: Item[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const day = (d: string) => d.replace(/-/g, "");
  const next = (d: string) => {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    return x.toISOString().slice(0, 10).replace(/-/g, "");
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenSourceX//Coming up//EN",
    ...items.flatMap((i) => [
      "BEGIN:VEVENT",
      `UID:${i.key}@opensourcex`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(i.date)}`,
      `DTEND;VALUE=DATE:${next(i.date)}`,
      `SUMMARY:${`${i.short}: ${i.label}`.replace(/([,;\\])/g, "\\$1")}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * The next dated milestones across every program, plus the announced LFX term's headline
 * dates, each with how close it is. Only dates from official timelines.
 */
export function ComingUp({
  deadlines,
  announce,
  checked,
}: {
  deadlines: Deadline[];
  announce: LfxAnnouncement | null;
  checked: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const items: Item[] = deadlines.map((d) => ({
    key: `${d.program.slug}-${d.date}-${d.label}`,
    label: d.label,
    slug: d.program.slug,
    short: d.program.short,
    date: d.date,
    days: d.days,
    href: `/programs/${d.program.slug}`,
  }));
  if (announce) {
    const rows = parseTimeline(announce.term);
    const term = `${announce.term.year} Term ${announce.term.termCode.slice(1)}`;
    for (const [re, label] of [
      [/proposal/i, `${term} project ideas open`],
      [/applications? open/i, `${term} applications open`],
      [/program begins/i, `${term} mentorship begins`],
    ] as const) {
      const r = find(rows, re);
      if (!r?.start || r.start < today) continue;
      items.push({
        key: `lfx-${announce.term.key}-${label}`,
        label,
        slug: "lfx-mentorship",
        short: "LFX",
        date: r.start,
        days: daysUntil(r.start, today),
        href: "/programs/lfx",
      });
    }
  }
  const list = items
    .filter((i, n, all) => all.findIndex((j) => j.key === i.key) === n)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);
  const week = list.filter((i) => i.days <= 7).length;
  const month = list.filter((i) => i.days <= 30).length;
  const calendar = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics(list))}`;

  return (
    <>
      <div className="cu-head">
        <div className="home-next-eyebrow">Coming up</div>
        {list.length > 0 && (
          <div className="cu-sum">
            <span className={week ? "cu-sum-hot" : undefined}>
              <b>{week}</b> this week
            </span>
            <span>
              <b>{month}</b> this month
            </span>
          </div>
        )}
      </div>
      {list.length ? (
        <ol className="cu-list">
          {list.map((d) => {
            const close = Math.max(0.04, Math.min(1, 1 - d.days / HORIZON));
            const tone = d.days <= 14 ? "hot" : d.days <= 30 ? "warm" : "calm";
            return (
              <li key={d.key}>
                <Link href={d.href} className={`cu-item cu-${tone}`}>
                  <span className="cu-days">
                    <strong>{d.days === 0 ? "Today" : d.days}</strong>
                    {d.days > 0 && <small>{d.days === 1 ? "day" : "days"}</small>}
                  </span>
                  <span className="cu-body">
                    <strong>{d.label}</strong>
                    <span className="cu-meta">
                      <span className="cu-mark">
                        <ProgramMark slug={d.slug} />
                      </span>
                      {d.short} · {formatInfoDate(d.date)}
                    </span>
                    <span className="cu-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round(close * 100)}%` }} />
                    </span>
                  </span>
                  <span className="cu-go" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="home-next-text">No dated milestones are coming up right now.</p>
      )}
      <div className="cu-foot">
        {list.length > 0 && (
          <a className="cu-cal" href={calendar} download="opensourcex-coming-up.ics">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
              />
            </svg>
            Add all to calendar
          </a>
        )}
        {checked && (
          <p className="home-deadline-note">
            From each program&apos;s official timeline, checked {formatInfoDate(checked)}.
          </p>
        )}
      </div>
    </>
  );
}
