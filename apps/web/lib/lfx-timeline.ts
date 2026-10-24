/**
 * Turns the official LFX term timeline (the cncf/mentoring README table, kept as text) into
 * dated rows. Dates are read, never guessed: a row with no month and day stays undated.
 */

export interface TimelineInput {
  year: number;
  termCode: "T1" | "T2" | "T3";
  label: string;
  startsOn: string | null;
  endsOn: string | null;
  sourceUrl: string | null;
  timeline: { activity: string; dates: string }[];
}

export interface TimelineRow {
  activity: string;
  /** the dates as published, without the bracketed note */
  dates: string;
  note: string | null;
  /** YYYY-MM-DD, UTC calendar days */
  start: string | null;
  end: string | null;
  /** an exact UTC time on the last day, e.g. "18:00", when one is published */
  endTime: string | null;
  tbd: boolean;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAY = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})\b/gi;

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function parseTimeline(t: TimelineInput): TimelineRow[] {
  return t.timeline.map(({ activity, dates }) => {
    const raw = /\(([^)]+)\)/.exec(dates)?.[1]?.replace(/\*/g, "").trim();
    const note = raw ? raw[0]!.toUpperCase() + raw.slice(1) : null;
    const clean = dates
      .replace(/\s*\*?\([^)]*\)\*?/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const days = [...clean.matchAll(DAY)].map((m) => {
      const month = MONTHS.indexOf(m[1]!.slice(0, 3).toLowerCase());
      // a Term 1 timeline can begin in the previous November or December
      const year = t.termCode === "T1" && month >= 10 ? t.year - 1 : t.year;
      return iso(year, month, Number(m[2]));
    });
    const times = [...clean.matchAll(/\b(\d{1,2}:\d{2})\s*UTC\b/gi)].map((m) => m[1]!);
    return {
      activity,
      dates: clean,
      note,
      start: days[0] ?? null,
      end: days[1] ?? days[0] ?? null,
      endTime: times.at(-1) ?? null,
      tbd: /\bTBD\b/i.test(clean),
    };
  });
}

export type RowState = "done" | "now" | "next" | "later";

/** Where each row stands on `today` (YYYY-MM-DD): the first row still ahead is "next". */
export function rowStates(rows: TimelineRow[], today: string): RowState[] {
  let nextGiven = false;
  return rows.map((r) => {
    if (!r.start) return "later";
    if ((r.end ?? r.start) < today) return "done";
    if (r.start <= today) return "now";
    if (!nextGiven) {
      nextGiven = true;
      return "next";
    }
    return "later";
  });
}

export const find = (rows: TimelineRow[], re: RegExp) => rows.find((r) => re.test(r.activity));

/** The headline milestones, in the order a mentee cares about them. */
export function milestones(t: TimelineInput, rows: TimelineRow[]) {
  const proposals = find(rows, /proposal/i);
  const applications = find(rows, /applications? open/i);
  const results = find(rows, /selection|notification/i);
  return [
    proposals && {
      key: "proposals",
      label: "Project ideas",
      start: proposals.start,
      end: proposals.end,
    },
    applications && {
      key: "applications",
      label: "Applications",
      start: applications.start,
      end: applications.end,
    },
    results && { key: "results", label: "Results", start: results.start, end: results.end },
    t.startsOn && { key: "mentorship", label: "Mentorship", start: t.startsOn, end: t.endsOn },
  ].filter(Boolean) as { key: string; label: string; start: string | null; end: string | null }[];
}

/** The term to announce on `today`: the next one not yet started, else the one running. */
export function termToAnnounce<T extends TimelineInput>(terms: T[], today: string): T | null {
  const dated = terms.filter((t) => t.startsOn && t.timeline.length);
  return (
    dated.find((t) => t.startsOn! > today) ??
    dated.find((t) => t.startsOn! <= today && (t.endsOn ?? t.startsOn!) >= today) ??
    null
  );
}

/** Whole days from `today` to `day` (both YYYY-MM-DD). */
export const daysUntil = (day: string, today: string) =>
  Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);

export const fmtDay = (day: string, withYear = false) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });

export const fmtRange = (start: string | null, end: string | null) =>
  !start ? "" : !end || end === start ? fmtDay(start) : `${fmtDay(start)} – ${fmtDay(end)}`;

/** The official page on the main branch (the stored link is pinned to a commit). */
export const officialUrl = (sourceUrl: string | null) =>
  sourceUrl?.replace(/\/blob\/[0-9a-f]{40}\//, "/blob/main/") ??
  "https://github.com/cncf/mentoring/tree/main/programs/lfx-mentorship";

/** An .ics calendar with one all-day event per dated row. */
export function toIcs(t: TimelineInput, rows: TimelineRow[]) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const day = (d: string) => d.replace(/-/g, "");
  const after = (d: string) => {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    return x.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1");
  const events = rows
    .filter((r) => r.start)
    .map((r, i) =>
      [
        "BEGIN:VEVENT",
        `UID:lfx-${t.year}-${t.termCode}-${i}@opensourcex`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day(r.start!)}`,
        `DTEND;VALUE=DATE:${after(r.end ?? r.start!)}`,
        `SUMMARY:${esc(`LFX ${t.year} Term ${t.termCode.slice(1)}: ${r.activity}`)}`,
        `DESCRIPTION:${esc(`${r.dates}${r.note ? ` (${r.note})` : ""}. Source: ${officialUrl(t.sourceUrl)}`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    );
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OpenSourceX//LFX timeline//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
