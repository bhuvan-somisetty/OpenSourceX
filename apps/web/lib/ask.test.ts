import { describe, expect, it } from "vitest";
import type { HistoryProgram, HistoryTerm, LfxHistory } from "@opensourcex/database";
import { answerQuestion, parseQuestion } from "./ask";

const term = (
  year: number,
  code: "T1" | "T2" | "T3",
  starts: string,
  ends: string,
): HistoryTerm => ({
  key: `${year}-${code}`,
  year,
  termCode: code,
  label: `${year} Term ${code.slice(1)}`,
  sourceUrl: `https://github.com/cncf/mentoring/blob/x/${year}-${code}/README.md`,
  startsOn: starts,
  endsOn: ends,
  timeline: [
    { activity: "Mentee Applications Open", dates: "Mon, Aug 3 – Tue, Aug 18" },
    { activity: "Last Day of Term", dates: "Fri, Nov 27" },
  ],
});

let n = 0;
const prog = (
  cncfProject: string,
  terms: string[],
  skills: string[] = [],
  mentors = [{ name: "Yuri Shkuro", github: "yurishkuro" }],
): HistoryProgram => ({
  id: `mp-${++n}`,
  title: `${cncfProject} program ${n}`,
  cncfProject,
  terms,
  skills,
  summary: `Improve ${cncfProject}`,
  upstreamUrl: null,
  lfxUrl: null,
  mentors,
});

const H: LfxHistory = {
  terms: [
    term(2025, "T2", "2025-06-09", "2025-08-29"),
    term(2025, "T3", "2025-09-08", "2025-11-28"),
    term(2026, "T1", "2026-03-02", "2026-05-29"),
    term(2026, "T3", "2026-09-07", "2026-11-27"),
  ],
  programs: [
    prog("Jaeger", ["2025-T2"], ["Go", "React"]),
    prog("Jaeger", ["2025-T3"], ["Go"]),
    prog("Jaeger", ["2026-T1"]),
    prog("Jaeger", ["2026-T3"]),
    prog("Kyverno", ["2025-T3"], ["Rust"], [{ name: "Jim Bugwadia", github: "JimBugwadia" }]),
    prog("Kyverno", ["2026-T3"], [], [{ name: "Jim Bugwadia", github: "JimBugwadia" }]),
  ],
  source: { publisher: "CNCF", url: "https://github.com/cncf/mentoring", fetchedAt: null },
};
const TODAY = "2026-10-08";
const ask = (q: string) => answerQuestion(q, H, TODAY);

describe("parseQuestion", () => {
  it("does not read 'mentorship' as a mentor question", () => {
    expect(parseQuestion("Jaeger in LFX Mentorship", H).intents.has("mentor")).toBe(false);
    expect(parseQuestion("who mentored Jaeger", H).intents.has("mentor")).toBe(true);
  });
  it("reads years, terms and project names", () => {
    const p = parseQuestion("jaeger programs in 2025 term 3", H);
    expect([p.project, p.year, p.termCode]).toEqual(["Jaeger", 2025, "T3"]);
    expect(parseQuestion("fall 2025", H).termCode).toBe("T3");
  });
});

describe("answerQuestion", () => {
  it("counts a project's terms from the data", () => {
    const a = ask("How many times has Jaeger been in LFX Mentorship?");
    expect(a.kind).toBe("project");
    expect(a.summary).toMatch(/took part in 4 of 4/);
    expect(a.summary).toMatch(/not missed a single term/);
  });
  it("lists a project's mentors", () => {
    const a = ask("Who mentors Kyverno?");
    expect(a.kind).toBe("project-mentors");
    expect(a.table?.rows[0]).toEqual(["Jim Bugwadia", "@JimBugwadia", "2025 Term 3, 2026 Term 3"]);
  });
  it("ranks recurring projects", () => {
    const a = ask("Which CNCF projects repeat in every term?");
    expect(a.kind).toBe("recurring");
    expect(a.summary).toMatch(/every one of the 4 terms since 2021: Jaeger/);
    expect(a.table?.rows[0]?.[0]).toBe("Jaeger");
  });
  it("answers a term timeline with its README as the source", () => {
    const a = ask("What is the timeline for 2026 Term 3?");
    expect(a.kind).toBe("timeline");
    expect(a.table?.rows).toHaveLength(2);
    expect(a.summary).toMatch(/in progress/);
    expect(a.sources[0]?.url).toMatch(/2026-T3\/README\.md$/);
  });
  it("finds programs by skill, mentors by handle", () => {
    expect(ask("Which LFX projects use Rust?")).toMatchObject({ kind: "skill" });
    expect(ask("Which LFX projects use Rust?").summary).toMatch(/^1 CNCF mentorship program/);
    const m = ask("What did @yurishkuro mentor?");
    expect(m.kind).toBe("mentor");
    expect(m.summary).toMatch(/4 CNCF LFX Mentorship programs across 4 terms/);
  });
  it("says so when the data has no answer", () => {
    expect(ask("what is the weather today").kind).toBe("none");
  });
});
