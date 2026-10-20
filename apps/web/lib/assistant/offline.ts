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
  const askElig = /eligib|who can|can i|requirement|criteria|allowed|age|student/.test(q);
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
    "Ask about either one for its full timeline and how to apply.",
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

function recurringAnswer(k: Knowledge, p: KnowledgeProgram | null): string {
  const rows = recurringOrgs(k, p?.def.slug ?? null, 40);
  if (!rows.length) return `No organizations are recorded${p ? ` for ${p.def.name}` : ""} yet.`;
  if (p) {
    const all = p.years.length;
    const every = rows.filter((r) => r.years.length === all);
    const isLfx = p.def.slug === "lfx-mentorship";
    return [
      `### Organizations that keep coming back to ${p.def.name}`,
      every.length && all > 1
        ? `${plural(every.length, "organization")} took part in every recorded year (${yearsText(p.years)}).`
        : `Ranked by how many recorded ${isLfx ? "terms" : "years"} each organization took part in (${yearsText(p.years)}).`,
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
  const ctx = /\b(use|uses|using|with|in|written|language|tech|stack|for)\b/.test(q);
  for (const t of TECH) {
    if (["go", "c", "r", "ai"].includes(t) && !ctx) continue;
    if (` ${q} `.includes(` ${t} `)) return t === "golang" ? "go" : t === "node js" ? "node.js" : t;
  }
  return null;
}

const FAQ: { test: RegExp; answer: string }[] = [
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
    !parts.length &&
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
  if (!mentioned.length && (parts.length || /\b(its|their|it|they|that|this)\b/.test(q)))
    for (const prev of [...ctx.previous].reverse()) {
      mentioned = orgsMentioned(k, prev);
      if (mentioned.length) break;
    }

  // 1. links and details for a named organization
  if (
    mentioned.length &&
    !isRecurring &&
    !viaFoundation &&
    !(lfxSpecific && program?.def.slug === "lfx-mentorship" && !parts.length)
  ) {
    const org = mentioned[0]!;
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
      if (g) return withNote(`${g}\n\n---\n\n${orgCard(org, ["repo", "chat"], q)}`);
    }
    const body = orgCard(org, parts.length ? parts : ["all"], q);
    const others = mentioned.slice(1, 4);
    return withNote(
      others.length && !parts.length
        ? `${body}\n\n---\n\n${others.map((o) => orgCard(o, ["all"], q)).join("\n\n---\n\n")}`
        : body,
    );
  }

  // 2. recurring organizations
  if (isRecurring) {
    if (program?.def.slug === "lfx-mentorship" && k.lfx)
      return withNote(lfxToMarkdown(answerQuestion(raw, k.lfx)));
    return withNote(recurringAnswer(k, program));
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
