import { beforeAll, describe, expect, it } from "vitest";
import type { HistoryProgram, LfxHistory } from "@opensourcex/database";
import { buildKnowledge, findOrg, recurringOrgs, type Knowledge } from "./knowledge";
import { answerOffline } from "./offline";

const prog = (
  name: string,
  slug: string,
  terms: string[],
  skills: string[] = [],
): HistoryProgram => ({
  id: `mp-${name}-${terms[0]}`,
  title: `${name} program`,
  cncfProject: name,
  cncfProjectSlug: slug,
  terms,
  skills,
  summary: null,
  upstreamUrl: null,
  lfxUrl: null,
  mentors: [{ name: "Ada Lovelace", github: "ada" }],
});

const LFX: LfxHistory = {
  terms: [
    {
      key: "2025-T3",
      year: 2025,
      termCode: "T3",
      label: "2025 Term 3",
      sourceUrl: null,
      startsOn: "2025-09-08",
      endsOn: "2025-11-28",
      timeline: [],
    },
    {
      key: "2026-T1",
      year: 2026,
      termCode: "T1",
      label: "2026 Term 1",
      sourceUrl: null,
      startsOn: "2026-03-02",
      endsOn: "2026-05-29",
      timeline: [],
    },
  ],
  programs: [
    prog("Volcano", "volcano", ["2025-T3"], ["Go"]),
    prog("Volcano", "volcano", ["2026-T1"], ["Go"]),
    prog("WasmEdge", "wasmedge", ["2025-T3"], ["Rust"]),
  ],
  source: { publisher: "CNCF", url: "https://github.com/cncf/mentoring", fetchedAt: null },
};

let k: Knowledge;
beforeAll(async () => {
  k = await buildKnowledge(LFX);
});

describe("knowledge index", () => {
  it("merges every program's organizations and finds them by name", () => {
    expect(k.orgs.length).toBeGreaterThan(500);
    expect(findOrg(k, "volcano").org?.repoUrl).toBe("https://github.com/volcano-sh/volcano");
    expect(findOrg(k, "WasmEdge").org?.chats.some((c) => c.platform === "discord")).toBe(true);
  });

  it("ranks organizations that repeat inside a program by years", () => {
    const rows = recurringOrgs(k, "gsoc", 10);
    expect(rows.length).toBe(10);
    expect(rows[0]!.years.length).toBeGreaterThanOrEqual(rows[9]!.years.length);
  });
});

describe("offline answers", () => {
  it("gives a repository link for a named org", () => {
    const a = answerOffline("give me volcano org repo link", k);
    expect(a).toContain("https://github.com/volcano-sh/volcano");
    expect(a).not.toContain("Community chat");
  });

  it("gives the Slack channel for a named org", () => {
    const a = answerOffline("give me wasmedge slack link", k);
    expect(a).toContain("CNCF Slack");
    expect(a).toContain("#WasmEdge");
  });

  it("follows up on the org from an earlier message", () => {
    const a = answerOffline("and its discord?", k, { previous: ["tell me about wasmedge"] });
    expect(a).toContain("https://discord.gg/h4KDyB8XTt");
  });

  it("lists organizations that repeat", () => {
    expect(answerOffline("tell me repeating orgs in gsoc", k)).toMatch(
      /keep coming back to Google Summer of Code/,
    );
    expect(answerOffline("which orgs repeat across programs?", k)).toMatch(
      /across the most programs/,
    );
  });

  it("answers program stipend questions from the program file", () => {
    expect(answerOffline("what is the gsoc stipend?", k)).toMatch(/Stipend/);
  });

  it("gives community links for orgs in other LFX foundations and programs", () => {
    expect(answerOffline("lf energy slack", k)).toContain("https://slack.lfenergy.org/");
    expect(answerOffline("hiero discord", k)).toMatch(/Hiero Ledger[\s\S]*discord/);
    expect(answerOffline("tryton forum", k)).toContain("https://discuss.tryton.org");
  });

  it("reads a program's own name as the program, not an org", () => {
    expect(answerOffline("summer of bitcoin stipend", k)).toMatch(/^### Summer of Bitcoin/);
  });

  it("lists the orgs of one LFX foundation", () => {
    expect(answerOffline("lfx decentralized trust orgs", k)).toMatch(/\(LF Decentralized Trust\)/);
    expect(answerOffline("list SONiC organizations", k)).toMatch(/\(SONiC Foundation\)/);
  });

  it("answers program questions asked about an LFX foundation", () => {
    for (const q of ["stipend for LFDT", "RISC-V deadline", "how to apply to open mainframe"]) {
      const a = answerOffline(q, k);
      expect(a).toMatch(/takes part through LFX Mentorship/);
      expect(a).toMatch(/### LFX Mentorship/);
    }
    expect(answerOffline("SONiC eligibility", k)).toContain("/programs/lfx?f=sonic");
  });

  it("answers an org's stipend with its program's", () => {
    expect(answerOffline("volcano stipend", k)).toMatch(/Volcano\*\* takes part in[\s\S]*Stipend/);
  });

  it("answers every program detail the program pages show", () => {
    expect(answerOffline("gsoc stipend in india", k)).toMatch(
      /Stipend in India:\*\* small project \$/,
    );
    expect(answerOffline("summer of bitcoin stipend in nigeria", k)).toMatch(/paid in BTC/);
    expect(answerOffline("how long is outreachy", k)).toMatch(/\| Length \|/);
    expect(answerOffline("is mlh fellowship remote", k)).toMatch(/\| Format \|/);
    expect(answerOffline("who runs ospp", k)).toMatch(/\*\*Run by:\*\* Institute of Software/);
    expect(answerOffline("how is lfx stipend paid", k)).toMatch(/\*\*How it is paid:\*\*/);
    expect(answerOffline("gsoc official website", k)).toMatch(/\*\*Official links:\*\*/);
    const tracks = answerOffline("summer of bitcoin tracks", k);
    expect(tracks).toMatch(/\| Tracks \|/);
    expect(tracks).not.toMatch(/\*\*Stipend/);
    expect(answerOffline("season of docs stipend", k)).toMatch(/Grants to organizations/);
  });

  it("answers questions across programs", () => {
    expect(answerOffline("compare gsoc and outreachy", k)).toMatch(
      /^### Google Summer of Code vs Outreachy/,
    );
    expect(answerOffline("list all programs", k)).toMatch(/programs on OpenSourceX/);
    expect(answerOffline("which program pays the most", k)).toMatch(/\| Stipend \|/);
    expect(answerOffline("upcoming deadlines", k)).toMatch(/^### Coming up across programs/);
  });

  it("answers questions about OpenSourceX itself", () => {
    const cases: [string, RegExp][] = [
      ["what is opensourcex", /^### OpenSourceX/],
      ["how do i save an organization", /^### Saving organizations/],
      ["how to report a problem", /^### Help & support/],
      ["can i login with google", /^### Signing in/],
      ["do you sell my data", /^### Your data/],
      ["where does the data come from", /^### Where the data comes from/],
      ["security contact", /^### Reporting a security problem/],
      ["what can you do", /^### About Ask/],
      ["recommend me an org", /^### Finding organizations for you/],
      ["what does analyze repository do", /^### Analyze a repository/],
      ["how many organizations are there", /^### OpenSourceX in numbers/],
      ["can i apply to multiple programs", /apply\*\* to several programs/],
    ];
    for (const [q, re] of cases) expect(answerOffline(q, k), q).toMatch(re);
  });

  it("says whether an org is in the program asked about", () => {
    expect(answerOffline("is volcano in gsoc", k)).toMatch(/^\*\*No\.\*\* Volcano is not recorded/);
    expect(answerOffline("is volcano in lfx", k)).toMatch(/^\*\*Yes\.\*\* Volcano takes part/);
  });

  it("does not read a program's name as a technology", () => {
    expect(answerOffline("list summer of bitcoin organizations", k)).not.toMatch(/using bitcoin/);
  });

  it("is honest when nothing matches", () => {
    expect(answerOffline("zzqx flurble", k)).toMatch(/couldn't find/);
  });
});

describe("forecasts", () => {
  const term = (year: number, code: "T1" | "T2" | "T3") => ({
    key: `${year}-${code}`,
    year,
    termCode: code,
    label: `${year} Term ${code.slice(1)}`,
    sourceUrl: null,
    startsOn: null,
    endsOn: null,
    timeline: [],
  });
  const keys = ["2025-T3", "2026-T1", "2026-T2", "2026-T3"];
  const history: LfxHistory = {
    terms: [
      term(2025, "T3"),
      term(2026, "T1"),
      term(2026, "T2"),
      term(2026, "T3"),
      term(2027, "T1"),
    ],
    programs: [
      ...keys.map((t) => prog("Volcano", "volcano", [t])),
      prog("WasmEdge", "wasmedge", ["2025-T3"]),
    ],
    source: LFX.source,
  };
  let fk: Knowledge;
  beforeAll(async () => {
    fk = await buildKnowledge(history);
  });

  it("predicts the next LFX term from term history", () => {
    const a = answerOffline("what is your prediction of what orgs can repeat in 2027 term 1", fk);
    expect(a).toMatch(/^### Prediction: CNCF projects likely in LFX Mentorship 2027 Term 1/);
    expect(a).toMatch(/Volcano.*\| High \| 3 of 3/);
    expect(a).not.toMatch(/WasmEdge/);
    expect(a).toMatch(/not an official list/);
  });

  it("forecasts one named project", () => {
    expect(answerOffline("will volcano come in the next lfx term", fk)).toMatch(
      /Volcano.*\| High \|/,
    );
  });

  it("predicts a yearly program's next year", () => {
    expect(answerOffline("predict gsoc 2027 orgs", fk)).toMatch(
      /^### Prediction: organizations likely in Google Summer of Code 2027/,
    );
  });

  it("still lists a finished term's orgs as history", () => {
    expect(answerOffline("which orgs appeared in lfx 2026 term 3", fk)).not.toMatch(/Prediction/);
  });
});

describe("repositories that repeat inside an organization", () => {
  const withRepo = (term: string, repo: string): HistoryProgram => ({
    ...prog("Volcano", "volcano", [term]),
    id: `mp-${term}-${repo}`,
    upstreamUrl: `https://github.com/volcano-sh/${repo}/issues/1`,
  });
  let rk: Knowledge;
  beforeAll(async () => {
    rk = await buildKnowledge({
      ...LFX,
      programs: [
        withRepo("2025-T3", "volcano"),
        withRepo("2026-T1", "volcano"),
        withRepo("2026-T1", "dashboard"),
        withRepo("2025-T3", "website"),
      ],
    });
  });

  it("lists the latest term's repos and ranks them by terms", () => {
    const a = answerOffline(
      "in volcano org, give me repo links that repeated last time and which repeated many times",
      rk,
    );
    expect(a).toMatch(/^### Volcano: repositories that repeat/);
    expect(a).toMatch(/Latest term, 2026 Term 1:\*\* \[volcano-sh\/volcano\]/);
    expect(a).toMatch(
      /\| \[volcano-sh\/volcano\]\(https:\/\/github.com\/volcano-sh\/volcano\) \| 2 \|/,
    );
  });
});
