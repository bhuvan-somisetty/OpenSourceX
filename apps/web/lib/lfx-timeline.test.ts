import { describe, expect, it } from "vitest";
import {
  daysUntil,
  milestones,
  officialUrl,
  parseTimeline,
  rowStates,
  termToAnnounce,
  toIcs,
  type TimelineInput,
} from "./lfx-timeline";

// the official 2027 Term 1 table from cncf/mentoring
const T1_2027: TimelineInput = {
  year: 2027,
  termCode: "T1",
  label: "2027 Term 1 (Mar-May)",
  startsOn: "2027-03-08",
  endsOn: "2027-05-28",
  sourceUrl:
    "https://github.com/cncf/mentoring/blob/97525d8f004aa477c24f6ce2f34ce4d9b51bf75c/programs/lfx-mentorship/2027/01-Mar-May/README.md",
  timeline: [
    { activity: "Project Proposals Open", dates: "Wed, Jan 6 - Wed, Jan 27, 18:00 UTC" },
    {
      activity: "Mentor/Maintainer Info Sessions",
      dates: "Tue, Jan 12, Times TBD (will be multiple timezone options)",
    },
    {
      activity: "Mentee Applications Open",
      dates: "Wed, Feb 3, 00:00 UTC - Tue, Feb 16, 23:59 UTC",
    },
    {
      activity: "Selection Notifications",
      dates: "Wed, Mar 3 - Fri, Mar 5 (notifications may take a few days to reach all mentees)",
    },
    { activity: "Mentorship Program Begins", dates: "Mon, Mar 8" },
    { activity: "Last Day of Term", dates: "Fri, May 28" },
  ],
};

describe("LFX timeline", () => {
  const rows = parseTimeline(T1_2027);

  it("reads ranges, single days, UTC times, TBD and notes", () => {
    expect(rows[0]).toMatchObject({ start: "2027-01-06", end: "2027-01-27", endTime: "18:00" });
    expect(rows[1]).toMatchObject({ start: "2027-01-12", end: "2027-01-12", tbd: true });
    expect(rows[1]!.note).toBe("Will be multiple timezone options");
    expect(rows[1]!.dates).toBe("Tue, Jan 12, Times TBD");
    expect(rows[2]).toMatchObject({ start: "2027-02-03", end: "2027-02-16", endTime: "23:59" });
    expect(rows[3]).toMatchObject({ start: "2027-03-03", end: "2027-03-05" });
    expect(rows[4]).toMatchObject({ start: "2027-03-08", end: "2027-03-08", endTime: null });
  });

  it("marks done, now and the single next row", () => {
    expect(rowStates(rows, "2027-01-20")).toEqual([
      "now",
      "done",
      "next",
      "later",
      "later",
      "later",
    ]);
    expect(rowStates(rows, "2026-10-24")[0]).toBe("next");
  });

  it("picks the headline milestones and counts the days", () => {
    expect(milestones(T1_2027, rows).map((m) => [m.key, m.start, m.end])).toEqual([
      ["proposals", "2027-01-06", "2027-01-27"],
      ["applications", "2027-02-03", "2027-02-16"],
      ["results", "2027-03-03", "2027-03-05"],
      ["mentorship", "2027-03-08", "2027-05-28"],
    ]);
    expect(daysUntil("2027-02-03", "2026-10-24")).toBe(102);
  });

  it("announces the next term before it starts, then the running one", () => {
    const t3 = {
      ...T1_2027,
      year: 2026,
      termCode: "T3" as const,
      startsOn: "2026-09-01",
      endsOn: "2026-11-27",
    };
    expect(termToAnnounce([t3, T1_2027], "2026-10-24")?.year).toBe(2027);
    expect(termToAnnounce([t3, T1_2027], "2027-04-01")?.year).toBe(2027);
    expect(termToAnnounce([t3], "2026-10-24")?.year).toBe(2026);
  });

  it("links the official page on main and writes a calendar", () => {
    expect(officialUrl(T1_2027.sourceUrl)).toBe(
      "https://github.com/cncf/mentoring/blob/main/programs/lfx-mentorship/2027/01-Mar-May/README.md",
    );
    const ics = toIcs(T1_2027, rows);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270203");
    expect(ics).toContain("DTEND;VALUE=DATE:20270217");
  });
});
