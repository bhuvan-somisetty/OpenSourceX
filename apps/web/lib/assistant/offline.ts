import type { KnowledgeHit } from "@opensourcex/database";
import { answerQuestion, type Answer } from "@/lib/ask";
import {
  findProgramMatch,
  normalize,
  orgsMentioned,
  recurringOrgs,
  searchOrgs,
  type Knowledge,
  type KnowledgeOrg,
  type KnowledgeProgram,
} from "./knowledge";

/**
 * The free, offline answer engine. No model and no network: it reads the recorded knowledge index
 * and writes Markdown. Used when no AI provider is configured, when the free daily AI allowance is
 * used up, or when every provider fails.
 */
const cell = (s: string | number) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const md = (label: string, url: string) => `[${label.replace(/[[\]]/g, "")}](${url})`;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function table(columns: string[], rows: (string | number)[][], max = 25): string {
  if (!rows.length) return "";
  const head = `| ${columns.map(cell).join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows
    .slice(0, max)
    .map((r) => `| ${r.map(cell).join(" | ")} |`)
    .join("\n");
  const more = rows.length > max ? `\n\n_${rows.length - max} more not shown._` : "";
  return `${head}\n${body}${more}`;
}

const uniqNums = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);

function yearsText(ys: number[]) {
  if (!ys.length) return "";
  const s = [...ys].sort();
  return s.length > 3 && s.at(-1)! - s[0]! === s.length - 1 ? `${s[0]}–${s.at(-1)}` : s.join(", ");
}

type Part = "repo" | "chat" | "website" | "ideas" | "projects" | "all";

function wanted(q: string): Part[] {
  const out: Part[] = [];
  if (/\b(repo|repos|repository|repositories|github|gitlab|source code|codebase|source)\b/.test(q))
    out.push("repo");
  if (
    /\b(slack|discord|matrix|irc|zulip|gitter|telegram|chat|channel|channels|community|mailing list|forum|contact|talk|join)\b/.test(
      q,
    )
  )
    out.push("chat");
  if (/\b(website|site|homepage|home page|web page)\b/.test(q)) out.push("website");
  if (/\b(ideas?|idea list|project ideas|proposal)\b/.test(q)) out.push("ideas");
  if (/\b(projects|past projects|previous projects|worked on)\b/.test(q)) out.push("projects");
  return out;
}

function chatLines(o: KnowledgeOrg, platform?: string): string[] {
  const chats = platform ? o.chats.filter((c) => c.platform === platform) : o.chats;
  return chats.map((c) => {
    const channel = c.channels?.length ? ` · channel ${c.channels.join(", ")}` : "";
    const direct = c.channelUrl ? ` · ${md("open the channel", c.channelUrl)}` : "";
    return `- **${c.workspace}** (${c.platform}): ${md("join", c.joinUrl)}${channel}${direct}`;
  });
}

function orgCard(o: KnowledgeOrg, parts: Part[], q: string): string {
  const show = (p: Part) => parts.includes("all") || parts.includes(p);
  const lines: string[] = [`### ${o.name}`];
  if (o.description && parts.includes("all")) lines.push(o.description);
  const platform = [
    "slack",
    "discord",
    "matrix",
    "irc",
    "zulip",
    "gitter",
    "telegram",
    "forum",
  ].find((p) => q.includes(p));

  if (show("repo")) {
    const repo = o.repoUrl ?? o.githubUrl;
    lines.push(
      repo
        ? `**Repository:** ${md(repo.replace(/^https?:\/\//, ""), repo)}`
        : "**Repository:** not recorded for this organization.",
    );
    if (o.githubUrl && o.githubUrl !== repo)
      lines.push(`**GitHub:** ${md(o.githubUrl.replace(/^https?:\/\//, ""), o.githubUrl)}`);
  }
  if (show("chat")) {
    const cl = chatLines(o, platform);
    if (cl.length) lines.push("**Community chat:**", ...cl);
    else if (platform && o.chats.length)
      lines.push(
        `No ${platform} channel is recorded for ${o.name}. Recorded chats:`,
        ...chatLines(o),
      );
    else
      lines.push(
        "**Community chat:** none recorded. The organization's sources list no chat channel.",
      );
    if (o.chatSource && (cl.length || o.chats.length))
      lines.push(`_Chat details from ${md("the project's own docs", o.chatSource)}._`);
  }
  if (show("website") && o.website)
    lines.push(
      `**Website:** ${md(o.website.replace(/^https?:\/\//, "").replace(/\/$/, ""), o.website)}`,
    );
  else if (parts.includes("website"))
    lines.push(
      `**Website:** not recorded for this organization.${o.repoUrl ? ` Its repository is ${md(o.repoUrl.replace(/^https?:\/\//, ""), o.repoUrl)}.` : ""}`,
    );
  if (show("ideas")) {
    const ideas = o.programs.flatMap((e) =>
      e.links
        .filter((l) => /idea|proposal|contributor/i.test(l.label))
        .map((l) => ({ ...l, p: e.programName })),
    );
    lines.push(
      ideas.length
        ? "**Ideas and guides:**\n" +
            ideas.map((l) => `- ${md(l.label, l.url)} (${l.p})`).join("\n")
        : "**Ideas list:** not recorded.",
    );
  }
  if (parts.includes("projects")) {
    const year = Number(q.match(/\b(20[12]\d)\b/)?.[1]) || null;
    const rows = o.programs.flatMap((e) =>
      e.projects
        .filter((x) => !year || x.year === year)
        .map((x) => [
          x.url ? md(x.title, x.url) : x.title,
          x.year ?? "",
          md(e.programName, e.pageUrl),
        ]),
    );
    lines.push(
      rows.length
        ? `**Projects${year ? ` in ${year}` : ""}:**\n\n${table(["Project", "Year", "Program"], rows, 20)}`
        : `**Projects:** none recorded${year ? ` for ${year}` : ""}.`,
    );
  }
  if (parts.includes("all")) {
    if (o.tags.length) lines.push(`**Technologies:** ${o.tags.slice(0, 12).join(", ")}`);
    lines.push(
      "**Programs:**\n" +
        o.programs
          .map((e) => {
            const when = e.terms?.length
              ? `${plural(e.terms.length, "term")} (${yearsText(e.years)})`
              : yearsText(e.years);
            const projects = e.projectCount ? `, ${plural(e.projectCount, "project")}` : "";
            return `- ${md(e.programName, e.pageUrl)}: ${when}${projects}`;
          })
          .join("\n"),
    );
  } else {
    lines.push(
      `More on ${o.name}: ${o.programs.map((e) => md(e.programName, e.pageUrl)).join(" · ")}`,
    );
  }
  return lines.join("\n\n");
}

function lfxToMarkdown(a: Answer): string {
  const out = [`### ${a.title}`, a.summary];
  if (a.table?.rows.length) out.push(table(a.table.columns, a.table.rows));
  if (a.programs?.length)
    out.push(
      "**Programs:**\n" +
        a.programs
          .slice(0, 15)
          .map(
            (p) =>
              `- ${md(p.title, `/projects/${p.id}`)} · ${p.cncfProject} · ${p.term}${p.mentors.length ? ` · Mentors: ${p.mentors.join(", ")}` : ""}`,
          )
          .join("\n") +
        (a.programs.length > 15 ? `\n\n_${a.programs.length - 15} more not shown._` : ""),
    );
  out.push(
    `_Source: ${a.sources.map((s) => md(s.label, s.url)).join(" · ")}. CNCF content, CC BY 4.0._`,
  );
  return out.join("\n\n");
}

/** Question words that point at a program fact, by the fact labels the program files use. */
const FACT_TOPICS: [RegExp, RegExp][] = [
  [/how long|duration|length|weeks?|months?|period/, /length|period|hours|terms|timetable/i],
  [
    /hours?|size|small|medium|large|part ?time|full ?time|commitment|per week/,
    /size|hours|commitment|timetable|length|terms/i,
  ],
  [
    /remote|online|offline|in person|on ?site|location|format|region|which countries/,
    /format|location|region/i,
  ],
  [/evaluations?|midterm/, /evaluation/i],
  [/certificate|completion/, /certificate|completion/i],
  [
    /how many (proposals|projects|applications)|how are .* selected|selection process/,
    /proposals|projects|applications|selection/i,
  ],
  [/tracks?|areas?|domains?|topics?/, /tracks|areas|domain/i],
  [/cohorts?|terms?|batches|rounds?/, /cohorts|terms/i],
  [/employ|contract|job/, /employment/i],
  [/mentoring (style|format|model)|how (is|are) .*mentored/, /mentoring/i],
  [/presentation/, /presentation/i],
  [/before the internship|bootcamp|challenge round/, /before/i],
  [/funding|funded|still running|concluded|ended|discontinued/, /years|funding|status/i],
];

function matchingFacts(facts: { label: string; value: string }[], q: string) {
  const topics = FACT_TOPICS.filter(([ask]) => ask.test(q)).map(([, label]) => label);
  return facts.filter((f) => topics.some((re) => re.test(f.label)));
}

/** The stipend-table row of a country named in the question ("gsoc stipend in india"). */
function countryIn(p: KnowledgeProgram, q: string) {
  const rows = p.stipendTable?.rows ?? [];
  const t = ` ${q} `;
  const alias: Record<string, string> = {
    usa: "united states",
    "in us": "united states",
    america: "united states",
    uk: "united kingdom",
  };
  const hit = (name: string) => t.includes(` ${name} `);
  return (
    rows.find((r) => hit(normalize(String(r.country)))) ??
    rows.find((r) =>
      Object.entries(alias).some(
        ([a, full]) => hit(a) && normalize(String(r.country)).startsWith(full),
      ),
    ) ??
    null
  );
}

function programAnswer(p: KnowledgeProgram, q: string): string {
  const i = p.info;
  const lines = [`### ${p.def.name}`];
  if (!i) {
    lines.push(p.def.blurb, `${md("Open the program page", p.pageUrl)}`);
    return lines.join("\n\n");
  }
  const askStipend = /stipend|pay|paid|money|salary|amount|how much|usd|\$|btc|currency/.test(q);
  const askElig =
    /eligib|who can|can i|requirement|criteria|allowed|age|student|experience|beginners?|fresher|graduate|working professional/.test(
      q,
    );
  const askTime = /timeline|when|date|deadline|schedule|start|open|close|announce/.test(q);
  const askApply = /apply|application|how to|steps|proposal|join/.test(q);
  const askRunBy =
    /who (runs|run|organi[sz]es|hosts|funds|manages|conducts)|run by|organi[sz]er|host/.test(q);
  const askLinks = /\b(website|official|links?|faq|site|url|page)\b/.test(q);
  const facts = matchingFacts(i.facts, q);
  const country = askStipend || facts.length === 0 ? countryIn(p, q) : null;
  const any =
    askStipend ||
    askElig ||
    askTime ||
    askApply ||
    askRunBy ||
    askLinks ||
    facts.length > 0 ||
    !!country;

  lines.push(i.summary);
  if (i.statusNote) lines.push(`**Status:** ${i.statusNote}`);
  if (!any || askRunBy) lines.push(`**Run by:** ${i.runBy}`);
  if (country && p.stipendTable) {
    const t = p.stipendTable;
    const money = (v: string | number) =>
      typeof v === "number" ? `$${v.toLocaleString("en-US")}` : v;
    lines.push(
      `**Stipend in ${country.country}:** ` +
        t.columns
          .map((c) =>
            t.columns.length > 1 ? `${c} project ${money(country[c]!)}` : money(country[c]!),
          )
          .join(" · ") +
        ` (${t.currency}${t.paidIn ? `, paid in ${t.paidIn}` : ""}). ${md("Source", t.source)}, retrieved ${t.retrieved}.`,
    );
  }
  if ((!any || (askStipend && !country)) && i.stipend) {
    lines.push(`**Stipend:** ${i.stipend.headline}. ${i.stipend.detail}`);
    if (i.stipend.ranges?.length)
      lines.push(
        table(
          ["", "Amount"],
          i.stipend.ranges.map((r) => [r.label, r.value]),
        ),
      );
    if (i.stipend.yearNote) lines.push(i.stipend.yearNote);
    if (i.stipend.payments?.length && askStipend)
      lines.push(
        table(
          ["Payment", "Share", "When"],
          i.stipend.payments.map((x) => [x.label, x.share ?? "", x.when ?? ""]),
        ),
      );
    if (askStipend && i.stipend.method) lines.push(`**How it is paid:** ${i.stipend.method}`);
    if (askStipend && i.stipend.notes?.length)
      lines.push(i.stipend.notes.map((n) => `- ${n}`).join("\n"));
    if (askStipend && p.stipendTable)
      lines.push(
        `Amounts differ by country (${p.stipendTable.rows.length} countries recorded). Ask, for example, *${p.def.short} stipend in India*.`,
      );
  }
  if (askStipend && !i.stipend) {
    const funding = i.facts.find((f) => /funding/i.test(f.label));
    lines.push(
      `**Stipend:** ${funding ? funding.value : "no stipend is recorded for this program"}.`,
    );
  }
  if (facts.length)
    lines.push(
      table(
        ["", ""],
        facts.map((f) => [f.label, f.value]),
      ),
    );
  if ((!any || askElig) && i.eligibility.length)
    lines.push("**Eligibility:**\n" + i.eligibility.map((e) => `- ${e}`).join("\n"));
  // "gsoc 2027 timeline" before 2027 dates exist: say so, and show the latest one as a guide
  const tlYear = Math.max(
    ...(i.timeline ?? []).map((t) => Number(t.date.slice(0, 4)) || 0),
    Number(i.timelineTitle?.match(/\b(20\d\d)\b/)?.[1]) || 0,
  );
  const askedYear = Number(q.match(/\b(20\d\d)\b/)?.[1]) || 0;
  const timelineYear = Number(i.timelineTitle?.match(/\b(20\d\d)\b/)?.[1]) || tlYear;
  if (askTime && askedYear > timelineYear && timelineYear)
    lines.push(
      `**${p.def.short} ${askedYear} dates are not published yet.** The latest recorded timeline is for ${timelineYear}; programs usually keep a similar calendar, so use it as a rough guide and check ${i.links[0] ? md(i.links[0].label, i.links[0].url) : "the official site"} for the new dates.`,
    );
  if ((!any || askTime) && i.timeline?.length)
    lines.push(
      `**${i.timelineTitle ?? "Timeline"}:**\n\n` +
        table(
          ["Step", "Date"],
          i.timeline.map((t) => [t.label, t.date]),
        ),
    );
  if ((!any || askApply) && i.howToApply?.length)
    lines.push("**How to apply:**\n" + i.howToApply.map((s, n) => `${n + 1}. ${s}`).join("\n"));
  if (!any && i.facts.length)
    lines.push(
      table(
        ["", ""],
        i.facts.map((f) => [f.label, f.value]),
      ),
    );
  if (p.orgCount)
    lines.push(`${plural(p.orgCount, "organization")} recorded: ${md("browse them", p.pageUrl)}.`);
  const links = [...i.links, ...i.sources.map((s) => ({ label: s.label, url: s.url }))];
  if (askLinks && i.links.length)
    lines.push("**Official links:**\n" + i.links.map((l) => `- ${md(l.label, l.url)}`).join("\n"));
  else if (links.length)
    lines.push(
      `_Official sources (checked ${i.checked}): ${links
        .slice(0, 5)
        .map((l) => md(l.label, l.url))
        .join(" · ")}_`,
    );
  return lines.join("\n\n");
}

const PROGRAM_DETAIL =
  /who (runs|run|organi[sz]es|hosts|funds|manages|conducts)|run by|official (site|website|links?|page)|\bfaq\b|how long|duration|how many hours|remote|online|in person|certificate|evaluations?|part ?time|full ?time/;
const UPCOMING =
  /upcoming|coming up|next deadlines?|deadlines|open (now|right now|currently)|currently open|accepting (applications|applicants)|which programs? (is|are) open|can i apply (now|today)|apply now/;
const ALL_PROGRAMS =
  /\b(programs|mentorships|internships|fellowships)\b.*\b(list|which|what|all|available|support|cover|have|best|compare|options)\b|\b(list|which|what|all|available|compare)\b.*\b(programs|mentorships|internships|fellowships)\b|pays? (the )?most|highest stipend|best stipend|all stipends/;

/** Every program named in the text, in order, each once ("compare gsoc and outreachy"). */
function programsMentioned(k: Knowledge, text: string): KnowledgeProgram[] {
  const found: { p: KnowledgeProgram; at: number }[] = [];
  const full = ` ${normalize(text)} `;
  let t = full;
  for (let m = findProgramMatch(k, t); m; m = findProgramMatch(k, t)) {
    if (!found.some((f) => f.p === m!.p)) found.push({ p: m.p, at: full.indexOf(` ${m.key} `) });
    t = t.replace(` ${m.key} `, " ");
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.p);
}

const statusText = (p: KnowledgeProgram) =>
  p.info ? { open: "Open", running: "Running", concluded: "Concluded" }[p.info.status] : "";

function programsOverview(k: Knowledge): string {
  const ps = k.programs.filter((p) => p.info);
  return [
    `### ${plural(ps.length, "program")} on OpenSourceX`,
    table(
      ["Program", "Status", "Stipend", "Run by", "Organizations"],
      ps.map((p) => [
        md(p.def.name, p.pageUrl),
        statusText(p),
        p.info!.stipend?.headline ?? "none recorded",
        p.info!.runBy,
        p.orgCount || "",
      ]),
    ),
    "Ask about any one of them for its stipend, eligibility, timeline or how to apply, for example *Outreachy eligibility*.",
  ].join("\n\n");
}

function compareAnswer(ps: KnowledgeProgram[], q: string): string {
  const fact = (p: KnowledgeProgram, re: RegExp) =>
    p.info?.facts.find((f) => re.test(f.label))?.value ?? "";
  const rows: [string, (p: KnowledgeProgram) => string | number][] = [
    ["Status", (p) => p.info?.statusNote ?? statusText(p)],
    ["Run by", (p) => p.info?.runBy ?? ""],
    ["Stipend", (p) => p.info?.stipend?.headline ?? "none recorded"],
    ["Length", (p) => fact(p, /length|period/i)],
    ["Format", (p) => fact(p, /format|location/i)],
    ["Eligibility", (p) => p.info?.eligibility.join(" ") ?? ""],
    ["Organizations", (p) => p.orgCount || ""],
  ];
  const wantElig = /eligib|who can/.test(q);
  return [
    `### ${ps.map((p) => p.def.name).join(" vs ")}`,
    table(
      ["", ...ps.map((p) => md(p.def.name, p.pageUrl))],
      rows
        .filter(([label]) => label !== "Eligibility" || wantElig)
        .map(([label, get]) => [label, ...ps.map(get)]),
    ),
    /together|same time|both|multiple|at once|simultaneous|parallel/.test(q)
      ? "OpenSourceX has no recorded rule on taking part in two programs at once. Most of them expect close to full-time work while they run, so compare the lengths and time commitments above and check each program's own rules before accepting two offers."
      : "Ask about either one for its full timeline and how to apply.",
  ].join("\n\n");
}

function upcomingAnswer(k: Knowledge): string {
  const today = new Date().toISOString().slice(0, 10);
  const dates = k.programs.flatMap((p) =>
    (p.info?.timeline ?? [])
      .filter((t) => /^\d{4}-\d{2}-\d{2}/.test(t.date) && t.date.slice(0, 10) >= today)
      .map((t) => ({ p, ...t })),
  );
  dates.sort((a, b) => a.date.localeCompare(b.date));
  const open = k.programs.filter((p) => p.info?.status === "open");
  const out = ["### Coming up across programs"];
  if (open.length)
    out.push(
      `**Open now:** ${open.map((p) => `${md(p.def.name, p.pageUrl)}${p.info!.statusNote ? ` (${p.info!.statusNote})` : ""}`).join(" · ")}`,
    );
  out.push(
    dates.length
      ? table(
          ["Date", "Program", "Step"],
          dates.map((d) => [d.date, md(d.p.def.name, d.p.pageUrl), d.label]),
        )
      : "No upcoming dates are recorded yet; programs publish their next timeline closer to the season.",
  );
  out.push(
    `**Current status:**\n${k.programs
      .filter((p) => p.info?.statusNote)
      .map((p) => `- ${md(p.def.name, p.pageUrl)}: ${p.info!.statusNote}`)
      .join("\n")}`,
  );
  return out.join("\n\n");
}

const PREDICT =
  /predict|prediction|forecast|likely|likelihood|chances?|expect(ed)?|guess|will .*\b(come|appear|repeat|return|be (there|selected|in)|participate|take part|join)|next (term|year|season|round|cohort)|upcoming term|coming term/;

type Likelihood = "High" | "Medium" | "Low";
const likelihood = (recent: number, recentOf: number, same: number, sameOf: number): Likelihood =>
  recent === recentOf || (recent >= recentOf - 1 && same >= Math.min(2, sameOf))
    ? "High"
    : recent >= 2 || same >= 2
      ? "Medium"
      : "Low";
const RANK: Record<Likelihood, number> = { High: 0, Medium: 1, Low: 2 };
const PREDICT_NOTE =
  "_This is a forecast from past participation, not an official list. The real list appears when the program announces it; until then, follow the organizations you like in their community chat._";

/** The LFX term after `key` ("2026-T3" -> "2027-T1"). */
function nextTermKey(key: string) {
  const [y, t] = key.split("-T").map(Number) as [number, number];
  return t >= 3 ? `${y + 1}-T1` : `${y}-T${t + 1}`;
}

/** Which CNCF projects are likely in an upcoming LFX term, from every recorded term. */
function lfxPrediction(k: Knowledge, q: string, only: KnowledgeOrg[]): string | null {
  const lfx = k.lfx;
  if (!lfx) return null;
  const byTerm = new Map<string, Set<string>>();
  for (const p of lfx.programs)
    for (const t of p.terms) {
      if (!byTerm.has(t)) byTerm.set(t, new Set());
      byTerm.get(t)!.add(p.cncfProject);
    }
  const done = lfx.terms.map((t) => t.key).filter((key) => byTerm.get(key)?.size);
  if (done.length < 3) return null;
  const named = q.match(
    /\b(20\d\d) ?(?:term|t) ?([123])\b|\b(?:term|t) ?([123]) (?:of )?(20\d\d)\b/,
  );
  let target = named
    ? `${named[1] ?? named[4]}-T${named[2] ?? named[3]}`
    : nextTermKey(done.at(-1)!);
  // a term that already has its list is answered with history, not a forecast
  if (byTerm.get(target)?.size) target = nextTermKey(done.at(-1)!);
  const history = done.filter((key) => key < target);
  const code = target.split("-")[1]!;
  const recentTerms = history.slice(-3);
  const sameTerms = history.filter((key) => key.endsWith(code)).slice(-3);
  const label = (key: string) =>
    lfx.terms.find((t) => t.key === key)?.label ?? key.replace("-T", " Term ");
  const projects = new Set(history.flatMap((key) => [...byTerm.get(key)!]));
  const rows = [...projects].map((name) => {
    const inTerm = (key: string) => byTerm.get(key)!.has(name);
    let streak = 0;
    for (let i = history.length - 1; i >= 0 && inTerm(history[i]!); i--) streak++;
    const recent = recentTerms.filter(inTerm).length;
    const same = sameTerms.filter(inTerm).length;
    return {
      name,
      recent,
      same,
      streak,
      total: history.filter(inTerm).length,
      chance: likelihood(recent, recentTerms.length, same, sameTerms.length),
    };
  });
  rows.sort(
    (a, b) =>
      RANK[a.chance] - RANK[b.chance] ||
      b.recent - a.recent ||
      b.same - a.same ||
      b.streak - a.streak ||
      b.total - a.total,
  );
  const wanted = only.length
    ? rows.filter((r) => only.some((o) => normalize(o.name) === normalize(r.name)))
    : rows.filter((r) => r.chance !== "Low");
  const lfxP = k.programs.find((p) => p.def.slug === "lfx-mentorship");
  const out = [
    ...(only.length
      ? wanted.map(
          (r) =>
            `**${r.name}: ${r.chance} chance for ${label(target)}.** It was in ${r.recent} of the last ${recentTerms.length} terms and ${r.same} of the past ${sameTerms.length} ${code.replace("T", "Term ")}s${r.streak ? `, ${r.streak} in a row so far` : ""}.`,
        )
      : []),
    `### Prediction: CNCF projects likely in LFX Mentorship ${label(target)}`,
    `Based on ${plural(history.length, "recorded term")} up to ${label(history.at(-1)!)}. **High** means the project was in all of the last ${recentTerms.length} terms, or nearly all of them and in most recent ${code.replace("T", "Term ")}s; **Medium** means it came at least twice recently or in at least 2 recent ${code.replace("T", "Term ")}s.`,
  ];
  if (only.length && !wanted.length)
    out.push(
      `${only.map((o) => o.name).join(", ")} has no CNCF LFX Mentorship programs recorded before ${label(target)}, so there is nothing to forecast from.`,
    );
  else
    out.push(
      table(
        [
          "CNCF project",
          "Chance",
          `Last ${recentTerms.length} terms`,
          `Past ${code.replace("T", "Term ")}s`,
          "Streak",
          "Terms in total",
        ],
        wanted.map((r) => [
          lfxP ? md(r.name, `/programs/lfx/organizations/${slugOf(k, r.name)}`) : r.name,
          r.chance,
          `${r.recent} of ${recentTerms.length}`,
          `${r.same} of ${sameTerms.length}`,
          r.streak ? `${r.streak} in a row` : "",
          r.total,
        ]),
        40,
      ),
    );
  const t = lfx.terms.find((x) => x.key === target);
  if (t?.timeline?.length)
    out.push(
      `**${t.label} dates:**\n\n${table(
        ["Activity", "Dates"],
        t.timeline.map((x) => [x.activity, x.dates]),
        8,
      )}`,
    );
  out.push(PREDICT_NOTE);
  return out.join("\n\n");
}

function slugOf(k: Knowledge, name: string) {
  const o = k.orgs.find(
    (x) =>
      normalize(x.name) === normalize(name) &&
      x.programs.some((e) => e.program === "lfx-mentorship" && e.foundation === "CNCF"),
  );
  return (
    o?.programs.find((e) => e.program === "lfx-mentorship" && e.foundation === "CNCF")?.orgSlug ??
    encodeURIComponent(name)
  );
}

/** Which organizations are likely in a program's next year, from the years they took part. */
function yearPrediction(
  k: Knowledge,
  p: KnowledgeProgram,
  q: string,
  only: KnowledgeOrg[],
  tech: string | null = null,
): string {
  const years = [...p.years].sort((a, b) => a - b);
  const askedYear = Number(q.match(/\b(20\d\d)\b/)?.[1]) || null;
  const target = askedYear && askedYear > years.at(-1)! ? askedYear : years.at(-1)! + 1;
  const recentYears = years.filter((y) => y < target).slice(-3);
  const rows = k.orgs
    .map((o) => {
      const ys = uniqNums(
        o.programs.filter((e) => e.program === p.def.slug).flatMap((e) => e.years),
      );
      if (!ys.length) return null;
      if (tech && !o.tags.some((t) => ` ${normalize(t)} `.includes(` ${normalize(tech)} `)))
        return null;
      const recent = recentYears.filter((y) => ys.includes(y)).length;
      let streak = 0;
      for (let y = recentYears.at(-1)!; ys.includes(y); y--) streak++;
      return {
        o,
        ys,
        recent,
        streak,
        chance: likelihood(recent, recentYears.length, 0, 0),
      };
    })
    .filter((r) => r !== null);
  rows.sort(
    (a, b) =>
      RANK[a.chance] - RANK[b.chance] ||
      b.recent - a.recent ||
      b.streak - a.streak ||
      b.ys.length - a.ys.length,
  );
  const wanted = only.length
    ? rows.filter((r) => only.includes(r.o))
    : rows.filter((r) => r.chance !== "Low");
  return [
    ...(only.length
      ? wanted.map(
          (r) =>
            `**${r.o.name}: ${r.chance} chance for ${p.def.short} ${target}.** It took part in ${r.recent} of ${recentYears.join(", ")}${r.streak ? `, ${r.streak} ${r.streak === 1 ? "year" : "years"} in a row so far` : ""}, and ${plural(r.ys.length, "year")} in total.`,
        )
      : []),
    `### Prediction: organizations${tech ? ` using ${tech}` : ""} likely in ${p.def.name} ${target}`,
    `Based on ${p.def.name} years ${yearsText(years)}. **High** means the organization took part in each of ${recentYears.join(", ")}; **Medium** means at least 2 of them.`,
    wanted.length
      ? table(
          ["Organization", "Chance", `Of ${recentYears.join(", ")}`, "Streak", "Years in total"],
          wanted.map((r) => [
            md(r.o.name, r.o.programs.find((e) => e.program === p.def.slug)!.pageUrl),
            r.chance,
            `${r.recent} of ${recentYears.length}`,
            r.streak ? `${r.streak} in a row` : "",
            r.ys.length,
          ]),
          40,
        )
      : `${only.map((o) => o.name).join(", ")} has no recorded ${p.def.name} years to forecast from.`,
    PREDICT_NOTE,
  ].join("\n\n");
}

const REPO_REPEAT =
  /\b(repos?|repositor(y|ies))\b.*\b(repeat\w*|again|most|many times|often|recurr\w*|last (time|term)|latest|previous|every term|each term|keep)\b|\b(repeat\w*|most|recurr\w*)\b.*\b(repos?|repositor(y|ies))\b/;

/** Repositories inside one CNCF project, by how many LFX terms had mentorships in them. */
function repoRepeatAnswer(k: Knowledge, org: KnowledgeOrg): string | null {
  const lfx = k.lfx;
  if (!lfx) return null;
  const own = lfx.programs.filter(
    (p) =>
      normalize(p.cncfProject) === normalize(org.name) ||
      (!!org.lfxSlug && p.cncfProjectSlug === org.lfxSlug),
  );
  if (!own.length) return null;
  const repos = new Map<string, { url: string; terms: Set<string>; programs: typeof own }>();
  for (const p of own) {
    const m = p.upstreamUrl?.match(/github\.com\/([^/\s]+\/[^/\s#?]+)/i);
    if (!m) continue;
    const name = m[1]!.replace(/\.git$/, "");
    const key = name.toLowerCase();
    if (!repos.has(key))
      repos.set(key, { url: `https://github.com/${name}`, terms: new Set(), programs: [] });
    const r = repos.get(key)!;
    p.terms.forEach((t) => r.terms.add(t));
    r.programs.push(p);
  }
  if (!repos.size) return null;
  const label = (key: string) => lfx.terms.find((t) => t.key === key)?.label ?? key;
  const orgTerms = [...new Set(own.flatMap((p) => p.terms))].sort();
  const latest = orgTerms.at(-1)!;
  const rows = [...repos.entries()]
    .map(([key, r]) => {
      const terms = [...r.terms].sort();
      return {
        key,
        ...r,
        list: terms,
        inLatest: r.terms.has(latest),
        before: terms.filter((t) => t < latest).length,
      };
    })
    .sort((a, b) => b.list.length - a.list.length || b.programs.length - a.programs.length);
  const repoLink = (r: (typeof rows)[number]) => md(r.key, r.url);
  const lastTime = rows.filter((r) => r.inLatest);
  const repeatedLast = lastTime.filter((r) => r.before > 0);
  const out = [
    `### ${org.name}: repositories that repeat in LFX Mentorship`,
    `${plural(own.length, "mentorship program")} across ${plural(orgTerms.length, "term")} (${label(orgTerms[0]!)} to ${label(latest)}), in ${repos.size} ${repos.size === 1 ? "repository" : "repositories"}.`,
    `**Latest term, ${label(latest)}:** ${lastTime.map(repoLink).join(", ") || "none"}.` +
      (repeatedLast.length
        ? ` Of these, ${repeatedLast.map((r) => `${repoLink(r)} (${plural(r.before + 1, "term")} so far)`).join(", ")} also had mentorships in earlier terms.`
        : " None of them had mentorships in earlier terms."),
    "**Repeated most often:**",
    table(
      ["Repository", "Terms", "Programs", "First", "Latest", `In ${label(latest)}`],
      rows.map((r) => [
        repoLink(r),
        r.list.length,
        r.programs.length,
        label(r.list[0]!),
        label(r.list.at(-1)!),
        r.inLatest ? "Yes" : "",
      ]),
      20,
    ),
    `Each program's own link points to an issue in that repository; see them on ${md(`${org.name}'s page`, (org.programs.find((e) => e.program === "lfx-mentorship") ?? org.programs[0]!).pageUrl)}. _Source: CNCF mentoring repository._`,
  ];
  return out.join("\n\n");
}

/** An LFX term named in the text: "2026 term 3", "term 1 2027", "t3 2026". */
function termIn(q: string): string | null {
  const m = q.match(
    /\b(20\d\d) ?(?:term|t) ?([123])\b|\b(?:term|t) ?([123]) (?:of |in )?(20\d\d)\b/,
  );
  return m ? `${m[1] ?? m[4]}-T${m[2] ?? m[3]}` : null;
}

/** Organizations in one year (or LFX term) split into first-timers and returning ones. */
function cohortAnswer(
  k: Knowledge,
  p: KnowledgeProgram,
  q: string,
  year: number | null,
  focus: "new" | "returning",
): string | null {
  if (p.def.slug === "lfx-mentorship") {
    const lfx = k.lfx;
    if (!lfx) return null;
    const byTerm = new Map<string, Set<string>>();
    for (const x of lfx.programs)
      for (const t of x.terms) {
        if (!byTerm.has(t)) byTerm.set(t, new Set());
        byTerm.get(t)!.add(x.cncfProject);
      }
    const done = lfx.terms.map((t) => t.key).filter((key) => byTerm.get(key)?.size);
    const asked = termIn(q);
    const target = asked && byTerm.get(asked)?.size ? asked : asked ? null : done.at(-1);
    const label = (key: string) => lfx.terms.find((t) => t.key === key)?.label ?? key;
    if (!target)
      return `LFX Mentorship ${label(asked!)} has no selected projects listed yet. Ask for a forecast instead, for example *which CNCF projects are likely in ${label(asked!)}*.`;
    const before = done.filter((key) => key < target);
    const rows = [...byTerm.get(target)!].map((name) => {
      const earlier = before.filter((key) => byTerm.get(key)!.has(name));
      return {
        name,
        earlier,
        programs: lfx.programs.filter((x) => x.cncfProject === name && x.terms.includes(target))
          .length,
      };
    });
    const fresh = rows.filter((r) => !r.earlier.length);
    const back = rows
      .filter((r) => r.earlier.length)
      .sort((a, b) => b.earlier.length - a.earlier.length);
    const shown = focus === "new" ? fresh : back;
    return [
      `### ${focus === "new" ? "New" : "Returning"} CNCF projects in LFX Mentorship ${label(target)}`,
      `${label(target)} has ${plural(rows.length, "CNCF project")}: ${fresh.length} taking part for the first time and ${back.length} that were in earlier terms.`,
      shown.length
        ? table(
            focus === "new"
              ? ["CNCF project", "Programs this term"]
              : ["CNCF project", "Programs this term", "Earlier terms", "Previous term"],
            shown.map((r) =>
              focus === "new"
                ? [md(r.name, `/programs/lfx/organizations/${slugOf(k, r.name)}`), r.programs]
                : [
                    md(r.name, `/programs/lfx/organizations/${slugOf(k, r.name)}`),
                    r.programs,
                    r.earlier.length,
                    label(r.earlier.at(-1)!),
                  ],
            ),
            40,
          )
        : `No ${focus === "new" ? "first-time" : "returning"} projects in this term.`,
    ].join("\n\n");
  }
  const years = [...p.years].sort((a, b) => a - b);
  const target = year && years.includes(year) ? year : year ? null : years.at(-1);
  if (!target)
    return `${p.def.name} ${year} has no organizations recorded yet. Ask for a forecast instead, for example *which organizations are likely in ${p.def.short} ${year}*.`;
  const rows = k.orgs
    .map((o) => {
      const entries = o.programs.filter((e) => e.program === p.def.slug);
      const ys = uniqNums(entries.flatMap((e) => e.years));
      return ys.includes(target)
        ? { o, entry: entries[0]!, earlier: ys.filter((y) => y < target) }
        : null;
    })
    .filter((r) => r !== null);
  const fresh = rows.filter((r) => !r.earlier.length);
  const back = rows
    .filter((r) => r.earlier.length)
    .sort((a, b) => b.earlier.length - a.earlier.length);
  const shown = focus === "new" ? fresh : back;
  const first = years[0]!;
  return [
    `### ${focus === "new" ? "New" : "Returning"} organizations in ${p.def.name} ${target}`,
    `${p.def.name} ${target} has ${plural(rows.length, "organization")}: ${fresh.length} not seen in any recorded earlier year${first < target ? ` (since ${first})` : ""} and ${back.length} that came back.`,
    shown.length
      ? table(
          focus === "new"
            ? ["Organization", "Repository"]
            : ["Organization", "Earlier years", "Repository"],
          shown.map((r) => {
            const repo = r.o.repoUrl
              ? md(r.o.repoUrl.replace(/^https?:\/\/(www\.)?/, ""), r.o.repoUrl)
              : "";
            return focus === "new"
              ? [md(r.o.name, r.entry.pageUrl), repo]
              : [md(r.o.name, r.entry.pageUrl), yearsText(r.earlier), repo];
          }),
          60,
        )
      : `No ${focus === "new" ? "new" : "returning"} organizations that year.`,
    first === target
      ? `_${target} is the first year OpenSourceX records, so every organization counts as new._`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function recurringAnswer(
  k: Knowledge,
  p: KnowledgeProgram | null,
  tech: string | null = null,
): string {
  const usesTech = (o: KnowledgeOrg) =>
    !tech || o.tags.some((t) => ` ${normalize(t)} `.includes(` ${normalize(tech)} `));
  const rows = recurringOrgs(k, p?.def.slug ?? null, tech ? 2000 : 40)
    .filter((r) => usesTech(r.org))
    .slice(0, 40);
  if (!rows.length)
    return `No organizations${tech ? ` using ${tech}` : ""} are recorded${p ? ` for ${p.def.name}` : ""} yet.`;
  if (p) {
    // terms only when the LFX term history loaded; otherwise rank by the years each org lists
    const isLfx = p.def.slug === "lfx-mentorship" && rows.some((r) => r.terms.length);
    const years = p.years.length ? p.years : uniqNums(rows.flatMap((r) => r.years));
    const all = years.length;
    const every = rows.filter((r) => r.years.length === all);
    return [
      `### Organizations${tech ? ` using ${tech}` : ""} that keep coming back to ${p.def.name}`,
      every.length && all > 1
        ? `${plural(every.length, "organization")} took part in every recorded year (${yearsText(years)}).`
        : `Ranked by how many recorded ${isLfx ? "terms" : "years"} each organization took part in (${yearsText(years)}).`,
      table(
        ["Organization", isLfx ? "Terms" : "Years", "Which", "Page"],
        rows.map((r) => [
          r.org.name,
          isLfx ? r.terms.length : `${r.years.length} of ${all}`,
          yearsText(r.years),
          md("open", r.org.programs.find((e) => e.program === p.def.slug)!.pageUrl),
        ]),
        30,
      ),
    ].join("\n\n");
  }
  return [
    "### Organizations that appear across the most programs",
    "Counted over every program OpenSourceX records (GSoC, LFX Mentorship, Outreachy, Season of Docs and more). Name a program to rank by years inside it.",
    table(
      ["Organization", "Programs", "Years"],
      rows.map((r) => [r.org.name, r.programs.join(", "), yearsText(r.years)]),
      30,
    ),
  ].join("\n\n");
}

/** LFX foundations as people name them: [pattern, entry foundation key, display name, page filter]. */
type Foundation = [RegExp, string, string, string];
const LFX_FOUNDATIONS: Foundation[] = [
  [/\bcncf\b|cloud native/, "CNCF", "CNCF", ""],
  [/decentrali[sz]ed trust|\blfdt\b|hyperledger/, "LFDT", "LF Decentralized Trust", "lfdt"],
  [/risc ?v/, "RISC-V", "RISC-V International", "riscv"],
  [/mainframe|\bomp\b/, "Open Mainframe", "Open Mainframe Project", "omp"],
  [/\bkernel\b/, "Linux Kernel", "The Linux Kernel Organization", "kernel"],
  [/\bsonic\b/, "SONiC", "SONiC Foundation", "sonic"],
  [/lf networking|\blfn\b/, "LF Networking", "LF Networking", "lfn"],
];

/** Mentees of an LFX foundation follow LFX Mentorship's shared rules. */
function foundationNote(f: Foundation, p: KnowledgeProgram) {
  const page = f[3] ? `${p.pageUrl}?f=${f[3]}` : p.pageUrl;
  return `**${f[2]}** takes part through ${p.def.name}, so its mentees follow the program's shared rules below. ${md(`Browse ${f[2]} organizations`, page)}.`;
}

function orgList(
  k: Knowledge,
  q: string,
  p: KnowledgeProgram | null,
  tech: string | null,
  year: number | null,
): string | null {
  const foundation =
    p?.def.slug === "lfx-mentorship" ? (LFX_FOUNDATIONS.find(([re]) => re.test(q)) ?? null) : null;
  const found = searchOrgs(k, {
    program: p?.def.slug,
    technology: tech ?? undefined,
    year: year ?? undefined,
  }).filter(
    (o) =>
      !foundation ||
      o.programs.some((e) => e.program === p!.def.slug && e.foundation === foundation[1]),
  );
  if (!found.length) return null;
  const where = foundation ? `${p!.def.name} (${foundation[2]})` : p?.def.name;
  const scope = [p ? `in ${where}` : "", tech ? `using ${tech}` : "", year ? `in ${year}` : ""]
    .filter(Boolean)
    .join(" ");
  return [
    `### ${plural(found.length, "organization")} ${scope}`.trim(),
    table(
      ["Organization", "Programs", "Repository"],
      found.map((o) => [
        md(
          o.name,
          (o.programs.find((e) => !p || e.program === p.def.slug) ?? o.programs[0]!).pageUrl,
        ),
        o.programs.map((e) => e.programName).join(", "),
        o.repoUrl ? md(o.repoUrl.replace(/^https?:\/\/(www\.)?/, ""), o.repoUrl) : "",
      ]),
      40,
    ),
  ].join("\n\n");
}

const TECH = [
  "rust",
  "go",
  "golang",
  "python",
  "javascript",
  "typescript",
  "java",
  "kotlin",
  "c++",
  "c",
  "c#",
  "ruby",
  "php",
  "swift",
  "scala",
  "haskell",
  "julia",
  "r",
  "dart",
  "flutter",
  "react",
  "node js",
  "android",
  "ios",
  "kubernetes",
  "docker",
  "linux",
  "machine learning",
  "ai",
  "llm",
  "webassembly",
  "wasm",
  "blockchain",
  "bitcoin",
  "security",
  "devops",
  "databases",
  "sql",
];

function techIn(q: string): string | null {
  const ctx =
    /\b(use|uses|using|with|in|written|language|tech|stack|for|need|needs|require|requires|required)\b/.test(
      q,
    );
  for (const t of TECH) {
    if (["go", "c", "r", "ai"].includes(t) && !ctx) continue;
    if (` ${q} `.includes(` ${t} `)) return t === "golang" ? "go" : t === "node js" ? "node.js" : t;
  }
  return null;
}

const SITE =
  /\b(opensourcex|open source x|this (site|website|app|platform|page)|your (site|website|app|platform))\b/;

/** Questions about OpenSourceX itself, answered from what its own pages say. */
const SITE_HELP: { test: RegExp; answer: () => string }[] = [
  {
    test: /^(what|who) (is|are) (opensourcex|open source x)|about (opensourcex|this (site|website|platform))|what (does|can) (opensourcex|this (site|website|platform|app)) do|what can i do (here|on (opensourcex|this))|who (made|built|created|owns|runs) (opensourcex|this)|features of (opensourcex|this)|is (opensourcex|this (site|website|platform)|it) free|does (opensourcex|it) cost/,
    answer: () =>
      [
        "### OpenSourceX",
        "OpenSourceX is a free website for finding your place in open source. It puts every mentorship program and organization in one place, with the sources behind each fact.",
        "- **[Programs](/programs):** GSoC, LFX Mentorship (CNCF, LFDT, RISC-V and the other Linux Foundation projects), Outreachy, Summer of Bitcoin, European Summer of Code, Igalia, Processing Foundation, MLH Fellowship, OSPP, C4GT and Season of Docs, each with stipend, eligibility, timeline and how to apply.",
        "- **[Discover](/discover):** pick programs, languages and technologies and get matching organizations, with the reasons they match.",
        "- **[Ask](/ask):** this chat. Ask anything about open source; signed-in users keep their chat history.",
        "- **[Saved](/saved):** organizations, projects and repositories you keep for later.",
        "- **[Analyze a repository](/repositories/analyze):** paste any public GitHub repository and see, live from GitHub, its activity, issues and good first issues, languages, contributors, releases, contribution docs, structure and how to start contributing.",
        "- **[Interview practice](/interview):** a preview; see its page for what works today.",
        "- **[Help & support](/support):** report a problem, with screenshots.",
        "Using it is free: no ads and no selling of data. See the [Terms](/terms) and [Privacy policy](/privacy).",
      ].join("\n\n"),
  },
  {
    test: /\b(save|saving|bookmark|unsave)\b.*\b(orgs?|organi[sz]ations?|projects?|repos?|repositor(y|ies)|programs?|items?|it|them)\b|\bsaved (items|orgs|organi[sz]ations|projects|page|list)\b|where (are|is|can i (find|see)) my saved|remove .* from saved/,
    answer: () =>
      "### Saving organizations\n\nPress **Save** on any organization card (in a program, on [Discover](/discover) or on the organization's page) to keep it. Everything you save is on the [Saved](/saved) page, grouped by program; unsave it there or on the card, and you'll be asked to confirm.\n\nSigned in, your saved items stay with your account. As a guest they stay in this browser for up to 7 days, and move to your account if you sign in later.",
  },
  {
    test: /report (a |an )?(problem|bug|issue|error)|contact (support|you|the team|opensourcex|admin)|support (page|team)|help (and|&) support|complain|complaint|withdraw|give feedback|send feedback|something (is )?(broken|not working|wrong) (on|with) (opensourcex|the site|this)/,
    answer: () =>
      "### Help & support\n\nOpen [Help & support](/support) while signed in, describe what went wrong and add up to 3 screenshots if they help, then confirm to send it. We read every report.\n\nYour reports are under **My complaints**, where you can follow them or withdraw one (you'll be asked to confirm). Only you and OpenSourceX staff can see them, and email addresses typed into a report are removed automatically.",
  },
  {
    test: /\b(sign ?in|signin|log ?in|login|sign ?up|signup|sign ?out|log ?out|logout)\b|\bguest\b|create (an )?account (on|in|for) (opensourcex|this)|continue (as|without)/,
    answer: () =>
      "### Signing in\n\nOn the [sign-in page](/login) choose **GitHub** or **Google**. OpenSourceX keeps your provider and display name; your name, email and picture stay only in your encrypted sign-in cookie.\n\nNo account? **Continue as a guest**: your chats and saved items stay in this browser for up to 7 days and move to your account if you sign in later. Sign out at any time from the profile menu.",
  },
  {
    test: /privacy|personal (data|information)|\bmy data\b|sell (my |your )?data|\bcookies?\b|tracking|\bads\b|delete (my )?(account|data|chats?|history)|export (my )?data|who can see my|store my (data|chats|questions)/,
    answer: () =>
      "### Your data\n\n- **Kept:** your sign-in provider and display name, your Ask chats (so history is there when you come back), your saved items, and problem reports with their screenshots.\n- **Not done:** no selling of data, no ads, no tracking or advertising cookies. Only the cookies needed to keep you signed in and protect sign-in.\n- **Shared to answer you:** the AI provider (currently Google Gemini) gets the text of your question and recent messages; live-data services get search terms only, never your identity. Vercel hosts the site and Neon the database.\n- **Your controls:** delete any chat from the Ask sidebar, remove saved items from [Saved](/saved), sign out from the profile menu, or ask through [Help & support](/support) to export or delete everything linked to your account.\n\nFull details: [Privacy policy](/privacy).",
  },
  {
    test: /terms (of (service|use)|and conditions)|\btos\b|rules (of|for) (the )?(site|opensourcex|using)|can i (scrape|use a bot)|allowed to scrape/,
    answer: () =>
      "### Terms of Service, in short\n\n- OpenSourceX is free; features may change.\n- Program details come from official sources and are dated, but they can change, and Ask can be incomplete or wrong. Check deadlines, eligibility and payments on the program's official page.\n- Don't misuse it, try to break its security, overload it or scrape it at scale.\n- Linked sites (GitHub, program websites, community chats) have their own terms.\n\nRead them in full: [Terms](/terms).",
  },
  {
    test: /vulnerab|security (contact|issue|bug|problem|report|policy|team)|report (a )?security|bug bounty|security\.txt|responsible disclosure/,
    answer: () => {
      const email = process.env.SECURITY_CONTACT_EMAIL;
      return `### Reporting a security problem\n\n${email ? `Email **${email}**` : "Use the contact on the [Security](/security) page"} with what you found, the steps to reproduce it and the impact you expect.\n\n- Don't post about it publicly before it is fixed.\n- Don't access, change or delete other people's data while testing.\n- Give a reasonable time to fix it before disclosing.\n\nDetails: [Security](/security) and [/.well-known/security.txt](/.well-known/security.txt).`;
    },
  },
  {
    test: /where (does|do|did) (the|your|this|all|opensourcex'?s?) (data|information|info)|data (come|comes|sources?)|sources? (of|for) (the |your )?(data|information)|how (often|frequently) .*(updated?|refresh)|is (the |your )?(data|information) (accurate|correct|reliable|up to date|verified|official)|how (accurate|reliable)|last (updated|checked)/,
    answer: () =>
      "### Where the data comes from\n\n- **Programs:** each program's official pages (stipend, eligibility, timeline, how to apply). Every answer names its sources and the date they were checked.\n- **Organizations:** each program's published organization lists, saved as dated snapshots; LFX Mentorship from the LFX public data and the CNCF mentoring repository.\n- **Community chats:** the organization's own README, CONTRIBUTING files and community pages; Discord invites are checked to be live.\n- **Live answers:** GitHub, package registries, OSV, Hacker News, Stack Exchange and Wikipedia, when you ask for current data.\n\nDetails can change after they were checked, so confirm deadlines and payments on the official page. Provenance: [Sources and status](/sources).",
  },
  {
    test: /what can (you|ask) (do|answer|help)|how does (ask|this chat|the chat) work|are you (an? )?(ai|bot|human|chatgpt|gemini)|which (ai|model|llm)|offline (mode|engine)|chat history|ask page/,
    answer: () =>
      "### About Ask\n\nAsk answers questions about open source from OpenSourceX's recorded data: programs (stipends, by country where published; eligibility; timelines; how to apply; comparisons), organizations (repository, Slack/Discord and other chats, website, ideas, technologies, past projects), LFX Mentorship terms and mentors, and guides on proposals, resumes, cover letters, Git and licences.\n\nWhen an AI model is available (currently Google Gemini, within a free daily limit) it writes the answer from that data; otherwise the offline engine answers from the same data. Signed-in users keep their chat history; delete any chat from the sidebar.\n\nTry: *GSoC stipend in India*, *compare GSoC and Outreachy*, *Volcano slack link*, *upcoming deadlines*.",
  },
  {
    test: /discover( page)?\b|recommend (me )?(an? |some )?(orgs?|organi[sz]ations?|projects?)|suggest (me )?(an? |some )?(orgs?|organi[sz]ations?|projects?)|which (org|organi[sz]ation|project) should i|find (orgs|organi[sz]ations|projects) (for|that match) me/,
    answer: () =>
      "### Finding organizations for you\n\nOpen [Discover](/discover), pick programs (GSoC, LFX and each LFX foundation such as CNCF or LFDT, Outreachy and more), languages and technologies, and it suggests organizations from every program, with the reasons they match. An organization in several programs is one card listing all of them; tap a card to see it in full, and **Save** the ones you like.\n\nYou can also ask here, for example *GSoC orgs using Rust* or *Outreachy orgs using Python*.",
  },
  {
    test: /analy[sz]e (a |my |the |this |any )?(github )?(repo|repository)|(repo|repository) analy[sz]/,
    answer: () =>
      "### Analyze a repository\n\nOpen [Analyze a repository](/repositories/analyze) and paste a GitHub URL (or just *owner/repo*). It reads the repository live from GitHub and shows:\n\n- **Activity:** commits in the last 90 days on the branch work is merged into, weeks with commits, merged and open pull requests, and a plain label (Active, Steady, Quiet…) with the numbers behind it.\n- **Issues:** open and recently closed issues, good first issues and help wanted, with the newest good first issues listed.\n- **Languages and technology:** language shares, build tools and CI found in the repository.\n- **Contribution docs:** README, contributing guide, code of conduct, licence and templates.\n- **Contributors, releases and the top-level folder structure.**\n- **How to start contributing**, built from those facts, plus the organization's programs, community chat and past LFX Mentorship projects when OpenSourceX records them.\n\nNothing is scored, and every figure links to its source on GitHub. On a project page, *Analyze this repository live* opens it directly.",
  },
  {
    test: /\binterview (practice|prep|preparation|page|mode)|practi[cs]e (an? |for )?interview|mock interview/,
    answer: () =>
      "### Interview practice\n\n[Interview practice](/interview) helps you explain a contribution: you answer first, and reference material appears only after you submit, with a check of which recorded technologies you mentioned. It is a preview; the PR review, Technical and Architecture modes need repository analysis and AI, which are not connected yet.",
  },
  {
    test: /mobile app|android app|ios app|iphone app|(download|install) (the |an )?app|play store|app store/,
    answer: () =>
      "OpenSourceX has no separate mobile app. Use the website in your phone's browser: the site is built to work on phones.",
  },
];

/** Counts across everything OpenSourceX records ("how many organizations are there?"). */
function statsAnswer(k: Knowledge, q: string): string | null {
  if (!/how many|number of|total|count/.test(q)) return null;
  const terms = k.lfx?.terms.length ?? 0;
  if (/\bterms?\b/.test(q) && terms)
    return `LFX Mentorship (CNCF) has ${plural(terms, "recorded term")}, from ${k.lfx!.terms[0]!.label} to ${k.lfx!.terms.at(-1)!.label}. Ask about one, for example *LFX 2025 term 3 projects*.`;
  if (!/\b(programs?|orgs?|organi[sz]ations?|projects?|foundations?|mentors?)\b/.test(q))
    return null;
  const ps = k.programs.filter((p) => p.info || p.orgCount);
  const foundations = new Set(
    k.orgs.flatMap((o) => o.programs.map((e) => e.foundation).filter(Boolean)),
  );
  const projects = k.orgs.reduce(
    (n, o) => n + o.programs.reduce((m, e) => m + e.projectCount, 0),
    0,
  );
  return [
    "### OpenSourceX in numbers",
    table(
      ["", "Count"],
      [
        ["Programs", ps.length],
        ["Organizations (each counted once, across programs)", k.orgs.length],
        ["Recorded mentorship projects", projects],
        ["LFX foundations and projects", foundations.size],
        ...(terms ? [["LFX Mentorship (CNCF) terms", terms] as [string, number]] : []),
      ],
    ),
    table(
      ["Program", "Organizations"],
      ps.map((p) => [md(p.def.name, p.pageUrl), p.orgCount || "none recorded"]),
    ),
  ].join("\n\n");
}

const FAQ: { test: RegExp; answer: string }[] = [
  {
    test: /(apply|applying|join|do|take part) (to|in|for)? ?(multiple|many|more than one|two|several|different) (programs|mentorships|internships)|(multiple|two) programs (at once|together|same time)/,
    answer:
      "You can usually **apply** to several programs, since each one selects separately. **Taking part** in two at once is another matter: most programs expect close to full-time work while they run, and OpenSourceX has no recorded rule that allows it. Check each program's own rules before accepting two offers.\n\nCompare two programs here, for example *compare GSoC and LFX*, or see them all with *list all programs*.",
  },
  {
    test: /^(hi|hello|hey|yo|hola|namaste|good (morning|evening|afternoon))\b/,
    answer:
      "Hi! Ask me anything about open source: organizations, their repositories and chat links, mentorship programs (GSoC, LFX Mentorship, Outreachy, Season of Docs, Summer of Bitcoin and more), stipends, timelines, or how to start contributing.",
  },
  {
    test: /what (is|are) open source|meaning of open source|define open source/,
    answer:
      "**Open source** software is software whose source code is published under a licence that lets anyone use, study, change and share it. Projects are usually built in public: code lives in a public repository, changes arrive as pull requests, and decisions happen in issues, chat and mailing lists.\n\nCommon licences are permissive (MIT, Apache-2.0, BSD) or copyleft (GPL, AGPL, MPL). The [Open Source Initiative](https://opensource.org/osd) keeps the formal definition.",
  },
  {
    test: /how (do|can|to|should) (i )?(start|begin|get started)|first contribution|start contributing|new to open source|beginner/,
    answer:
      "A reliable way to make your first contribution:\n\n1. **Pick a project you use** or one in a mentorship program you like. Browse them on the [Programs](/programs) page.\n2. **Read** its README, CONTRIBUTING file and code of conduct.\n3. **Join its chat** (Slack, Discord or Matrix) and say hello in the contributors channel.\n4. **Find a starter issue**: look for labels such as `good first issue` or `help wanted`.\n5. **Set up the project locally**, reproduce the issue, and ask before starting big changes.\n6. **Open a small, focused pull request** with a clear description and tests, then respond to review.\n\nAfter a few merged PRs you are in a strong position for GSoC, LFX Mentorship or Outreachy applications.",
  },
  {
    test: /what (is|are) (a )?(pull request|pr|prs)\b/,
    answer:
      "A **pull request** (PR; GitLab calls it a merge request) asks a project's maintainers to merge changes from your branch or fork into theirs. It shows the diff, runs automated checks, and is where review happens. Keep PRs small, link the issue they fix, and describe what changed and how you tested it.",
  },
  {
    test: /good first issue/,
    answer:
      '`good first issue` is a label maintainers put on small, well-described tasks meant for newcomers. Search for it on GitHub with `label:"good first issue" is:open`, add a language filter such as `language:go`, or open the issues tab of any project you like and filter by that label.',
  },
  {
    test: /(write|writing) (a )?(good )?proposal|proposal tips/,
    answer:
      "A strong mentorship proposal usually has:\n\n1. **Problem and goal**, in your own words, tied to the project's idea.\n2. **Technical plan**: what you will change and where in the codebase.\n3. **Timeline**: week-by-week milestones with buffer time.\n4. **Proof of work**: links to your merged or open PRs in that project.\n5. **About you**: relevant skills, time zone and availability.\n\nShare a draft with the mentors early, in the project's chat, and act on their feedback.",
  },
];

export interface OfflineContext {
  /** earlier user messages in this chat, oldest first, for follow-ups like "and its slack?" */
  previous: string[];
  aiNote?: string;
  /** knowledge-base sections matching the question, best first */
  guides?: KnowledgeHit[];
}

const GUIDE_INTENT =
  /\b(how|what|why|which|should|can i|do i|tips?|steps?|guide|explain|prerequisites?|requirements?|required|documents?|resume|cv|cover letter|statement of purpose|proposal|apply|applying|application|select|selected|selection|interview|difference|differ|compare|vs|versus|better|license|licence|git|pull request|pr|fork|rebase|sign ?off|dco|cla|contribut\w*|beginner|first|start|example|sample|template|mistakes?|evaluation|after)\b/;
const WANTS_EXAMPLE = /\b(example|examples|sample|reference|template|show me (a|an)?\s*proposal)\b/;

function strong(h: KnowledgeHit | undefined) {
  return !!h && (h.matched >= 2 || h.rank >= 1);
}

function sourcesLine(hits: KnowledgeHit[]) {
  const seen = new Map<string, { label: string; url: string | null }>();
  for (const h of hits) for (const s of h.sources) if (!seen.has(s.label)) seen.set(s.label, s);
  const list = [...seen.values()].slice(0, 4);
  return list.length
    ? `_Sources: ${list.map((s) => (s.url ? md(s.label, s.url) : s.label)).join(" · ")}_`
    : "";
}

function excerpt(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf("\n", max);
  return `${text.slice(0, cut > max / 2 ? cut : max).trim()}\n\n_…excerpt shortened._`;
}

/** Answer from the knowledge base: the best section in full, plus a closely related one. */
function guideAnswer(q: string, all: KnowledgeHit[]): string | null {
  const wantsExample = WANTS_EXAMPLE.test(q);
  const guides = all.filter((h) => h.kind === "guide");
  const refs = all.filter((h) => h.kind === "reference");
  const out: string[] = [];
  const used: KnowledgeHit[] = [];
  const top = guides[0];
  if (strong(top)) {
    out.push(`### ${top!.heading}`, top!.content);
    used.push(top!);
    const second = guides.find(
      (h) => h !== top && h.matched >= top!.matched - 1 && h.rank >= top!.rank * 0.6,
    );
    if (second && !wantsExample) {
      out.push(`### ${second.heading}`, second.content);
      used.push(second);
    }
  }
  if ((wantsExample || !used.length) && strong(refs[0])) {
    const r = refs[0]!;
    out.push(
      `### Example from a reference proposal: ${r.title.replace(/^Example [^:]*: /, "")}`,
      `_Section: ${r.heading}. Personal details removed; use it to learn the structure, not to copy._`,
      excerpt(r.content, 1800),
    );
    used.push(r);
  }
  if (!used.length) return null;
  const related = guides
    .filter((h) => !used.includes(h))
    .slice(0, 3)
    .map((h) => `*${h.heading}*`);
  const src = sourcesLine(used);
  if (src) out.push(src);
  if (related.length) out.push(`Related: ${related.join(" · ")}`);
  return out.join("\n\n");
}

export function answerOffline(
  question: string,
  k: Knowledge,
  ctx: OfflineContext = { previous: [] },
): string {
  const raw = question.trim().slice(0, 2000);
  const q = normalize(raw);
  const withNote = (s: string) => (ctx.aiNote ? `${s}\n\n_${ctx.aiNote}_` : s);
  if (!q) return withNote(FAQ[0]!.answer);

  const programMatch = findProgramMatch(k, raw);
  const year = Number(q.match(/\b(20[12]\d)\b/)?.[1]) || null;
  const parts = wanted(q);
  const linkParts = parts.filter((x) => x !== "projects");
  const isRecurring =
    /repeat|recurr|every (year|term|time)|each (year|term)|again and again|consisten|regular|returning|most (years|terms|times|often)|keep coming|many (years|terms)|multiple (years|terms)/.test(
      q,
    );
  const isProgramInfo =
    /stipend|pay|paid|money|salary|how much|eligib|who can|requirement|timeline|deadline|when (does|do|is|will)|dates?|schedule|how to apply|apply|application/.test(
      q,
    );
  const lfxSpecific = /\bmentors?\b|mentored|\bterm\b|\bterms\b|\bt[123]\b|cncf/.test(q);
  const dataQ =
    /stipend|paid|salary|how much|amount|timeline|deadline|dates?|when (does|do|is|will|are)|eligib|who can apply/.test(
      q,
    );
  const listIntent = /\b(orgs?|organi[sz]ations?|projects|communities|list|which|show|all)\b/.test(
    q,
  );

  // an LFX foundation ("LFDT stipend", "list SONiC orgs") is asked about through LFX Mentorship
  const foundation = LFX_FOUNDATIONS.find(([re]) => re.test(q)) ?? null;
  const lfxProgram = k.programs.find((p) => p.def.slug === "lfx-mentorship") ?? null;
  const viaFoundation =
    !!foundation &&
    !linkParts.length &&
    (isProgramInfo || listIntent) &&
    (!programMatch || programMatch.p === lfxProgram);
  const program = programMatch?.p ?? (viaFoundation ? lfxProgram : null);
  const withFoundation = (p: KnowledgeProgram, s: string) =>
    viaFoundation && p === lfxProgram ? `${foundationNote(foundation!, p)}\n\n${s}` : s;

  // the program's own name is not an organization ("summer of bitcoin" is not Bitcoin Core)
  const orgText = programMatch ? ` ${q} `.replace(` ${programMatch.key} `, " ") : raw;
  let mentioned = orgsMentioned(k, orgText).filter(
    (o) => !program || normalize(o.name) !== normalize(program.def.name),
  );
  if (
    foundation?.[1] === "CNCF" &&
    !linkParts.length &&
    (!programMatch || programMatch.p === lfxProgram)
  )
    mentioned = mentioned.filter((o) => normalize(o.name) !== "cncf");
  if (!mentioned.length && (parts.length || /\b(its|their|it|they|that|this)\b/.test(q)))
    for (const prev of [...ctx.previous].reverse()) {
      mentioned = orgsMentioned(k, prev);
      if (mentioned.length) break;
    }

  // 0. questions about OpenSourceX itself, and counts across everything it records
  const signInQ =
    /\b(log ?in|login|sign ?in|sign ?up)\b.*\b(google|github)\b|\b(google|github) (log ?in|login|sign ?in|account)\b/.test(
      q,
    );
  if (!programMatch && (SITE.test(q) || signInQ || !mentioned.length)) {
    const help = SITE_HELP.find((h) => h.test.test(q));
    if (help) return withNote(help.answer());
  }
  if ((!program || (program === lfxProgram && /\bterms?\b/.test(q))) && !mentioned.length) {
    const stats = statsAnswer(k, q);
    if (stats) return withNote(stats);
  }

  // 0a. repositories inside one organization that keep getting mentorships
  if (mentioned.length && REPO_REPEAT.test(q)) {
    const org = mentioned[0]!;
    const a = repoRepeatAnswer(k, org);
    return withNote(
      a ??
        `Repository-by-term history is recorded only for CNCF projects in LFX Mentorship, so OpenSourceX can't say which ${org.name} repositories repeat. Here is what it records:

${orgCard(org, ["repo", "projects"], q)}`,
    );
  }

  // 0b. forecasts: which organizations are likely in the next term or year
  if (
    PREDICT.test(q) &&
    !linkParts.length &&
    (program ||
      mentioned.length ||
      lfxSpecific ||
      /\b(orgs?|organi[sz]ations?|projects?|repeat|selected)\b/.test(q))
  ) {
    const yearly = program && program.def.slug !== "lfx-mentorship" && program.years.length >= 2;
    if (program && program !== lfxProgram && !yearly) {
      const last = program.years.at(-1);
      const list = last ? orgList(k, q, program, null, last) : null;
      return withNote(
        `OpenSourceX records ${program.def.name} for ${last ? `only ${last}` : "no year yet"}, so there is no pattern to forecast from. The organizations from that year are the best guide to the next one.${list ? `\n\n${list}` : ""}\n\n${PREDICT_NOTE}`,
      );
    }
    const forecast = yearly
      ? yearPrediction(k, program, q, mentioned, techIn(normalize(orgText)))
      : lfxPrediction(k, q, mentioned);
    const cncfOnly =
      !yearly && foundation && foundation[1] !== "CNCF"
        ? `Term-by-term history is recorded only for CNCF projects, so this forecast covers CNCF, not ${foundation[2]}.\n\n`
        : "";
    if (forecast) return withNote(cncfOnly + forecast);
  }

  // 0c. which organizations in a year or term are new, and which came back
  const newQ = /\bnew\b|first time|first-time|debut|newcomers?|newly/.test(q);
  const backQ =
    isRecurring ||
    /came back|again|returning|returned|old orgs|previous(ly)? (years?|terms?)/.test(q);
  const whenQ =
    !!year || !!termIn(q) || /this (year|term)|latest|recent|last (year|term)|current/.test(q);
  if (program && !mentioned.length && (newQ || (backQ && whenQ))) {
    const a = cohortAnswer(k, program, q, year, newQ ? "new" : "returning");
    if (a) return withNote(a);
  }

  // 1. links and details for a named organization
  if (
    mentioned.length &&
    !isRecurring &&
    !viaFoundation &&
    !(lfxSpecific && program?.def.slug === "lfx-mentorship" && !parts.length)
  ) {
    const org = mentioned[0]!;
    // "is volcano in gsoc?": say plainly whether the organization is in the named program
    const asked = programMatch?.p;
    const inAsked = asked && org.programs.filter((e) => e.program === asked.def.slug);
    const membership =
      asked && inAsked && !parts.length
        ? inAsked.length
          ? `**Yes.** ${org.name} takes part in ${inAsked.map((e) => md(e.programName, e.pageUrl)).join(", ")}${inAsked[0]!.years.length ? ` (${yearsText(uniqNums(inAsked.flatMap((e) => e.years)))})` : ""}.`
          : `**No.** ${org.name} is not recorded in ${md(asked.def.name, asked.pageUrl)}. It takes part in ${org.programs.map((e) => md(e.programName, e.pageUrl)).join(", ")}.`
        : "";
    const withMembership = (s: string) => (membership ? `${membership}\n\n${s}` : s);
    // stipend or dates of an organization in a single program are that program's ("volcano stipend")
    const orgPrograms = [...new Set(org.programs.map((e) => e.program))];
    const own =
      orgPrograms.length === 1 ? k.programs.find((p) => p.def.slug === orgPrograms[0]) : null;
    if (own && dataQ && !parts.length) {
      const entry = org.programs[0]!;
      return withNote(
        `**${org.name}** takes part in ${md(entry.programName, entry.pageUrl)}, so the program's rules apply.\n\n${programAnswer(own, q)}`,
      );
    }
    const isLfxMentorQ =
      /\bmentors?\b|mentored|who (mentors|guides)/.test(q) &&
      org.programs.some((e) => e.program === "lfx-mentorship");
    if (isLfxMentorQ && k.lfx) return withNote(lfxToMarkdown(answerQuestion(raw, k.lfx)));
    if (!parts.length && GUIDE_INTENT.test(q)) {
      const g = guideAnswer(q, ctx.guides ?? []);
      if (g) return withNote(withMembership(`${g}\n\n---\n\n${orgCard(org, ["repo", "chat"], q)}`));
    }
    const body = orgCard(org, parts.length ? parts : ["all"], q);
    const others = mentioned.slice(1, 4);
    return withNote(
      withMembership(
        others.length && !parts.length
          ? `${body}\n\n---\n\n${others.map((o) => orgCard(o, ["all"], q)).join("\n\n---\n\n")}`
          : body,
      ),
    );
  }

  // 2. recurring organizations
  if (isRecurring) {
    if (program?.def.slug === "lfx-mentorship" && k.lfx)
      return withNote(lfxToMarkdown(answerQuestion(raw, k.lfx)));
    return withNote(recurringAnswer(k, program, techIn(normalize(orgText))));
  }

  // 3a. questions across programs: compare two, list them all, upcoming deadlines
  const named = programsMentioned(k, raw);
  if (named.length >= 2) return withNote(compareAnswer(named, q));
  if (!program && UPCOMING.test(q)) return withNote(upcomingAnswer(k));
  if (!program && ALL_PROGRAMS.test(q)) return withNote(programsOverview(k));

  // the program details OpenSourceX shows: facts, who runs it, official links, per-country stipend
  const programQ =
    PROGRAM_DETAIL.test(q) ||
    (!!program && (FACT_TOPICS.some(([re]) => re.test(q)) || !!countryIn(program, q)));

  // 3. how-to and knowledge questions (prerequisites, proposals, cover letters, Git, licences...)
  if (GUIDE_INTENT.test(q) && !(program && (dataQ || programQ))) {
    const g = guideAnswer(q, ctx.guides ?? []);
    if (g) return withNote(g);
  }

  // 4. stipend, eligibility, timeline, how to apply, facts and links
  if (
    program &&
    (isProgramInfo || programQ) &&
    !(program.def.slug === "lfx-mentorship" && /\bterm\b|t[123]\b/.test(q))
  )
    return withNote(withFoundation(program, programAnswer(program, q)));

  // 5. CNCF LFX Mentorship history (terms, mentors, CNCF projects)
  if (k.lfx && (lfxSpecific || program?.def.slug === "lfx-mentorship")) {
    const a = answerQuestion(raw, k.lfx);
    if (a.kind !== "none" && a.kind !== "search") return withNote(lfxToMarkdown(a));
  }

  // 6. lists of organizations, by program and/or technology
  const tech = techIn(normalize(orgText));
  if ((program && listIntent) || tech) {
    const list = orgList(k, q, program, tech, year);
    if (list) return withNote(list);
  }
  if (program) return withNote(programAnswer(program, q));

  // 7. general open source questions with a known answer
  const faq = FAQ.find((f) => f.test.test(q));
  if (faq) return withNote(faq.answer);

  // 8. keyword search over organizations
  const found = searchOrgs(k, { query: raw }).slice(0, 12);
  // a single match is the organization the user meant ("hiero discord")
  if (found.length === 1) return withNote(orgCard(found[0]!, parts.length ? parts : ["all"], q));
  if (found.length && found.length < k.orgs.length)
    return withNote(
      [
        `### Organizations matching "${raw.slice(0, 80)}"`,
        table(
          ["Organization", "Programs", "Repository"],
          found.map((o) => [
            md(o.name, o.programs[0]!.pageUrl),
            o.programs.map((e) => e.programName).join(", "),
            o.repoUrl ? md(o.repoUrl.replace(/^https?:\/\/(www\.)?/, ""), o.repoUrl) : "",
          ]),
        ),
      ].join("\n\n"),
    );

  return withNote(
    "I couldn't find that in OpenSourceX's recorded data. In offline mode I can answer about organizations (repository, Slack/Discord, website, ideas), programs (stipend, eligibility, timeline, how to apply), organizations that repeat, and CNCF LFX Mentorship terms and mentors. For example: *give me the Volcano repo link*, *WasmEdge slack link*, *which orgs repeat in GSoC?*, *GSoC stipend*.",
  );
}
