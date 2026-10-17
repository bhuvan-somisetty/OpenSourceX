import { answerQuestion, type Answer } from "@/lib/ask";
import {
  findProgram,
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

type Part = "repo" | "chat" | "website" | "ideas" | "all";

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
  const platform = ["slack", "discord", "matrix", "irc", "zulip", "gitter", "telegram"].find((p) =>
    q.includes(p),
  );

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

function programAnswer(p: KnowledgeProgram, q: string): string {
  const i = p.info;
  const lines = [`### ${p.def.name}`];
  if (!i) {
    lines.push(p.def.blurb, `${md("Open the program page", p.pageUrl)}`);
    return lines.join("\n\n");
  }
  const askStipend = /stipend|pay|paid|money|salary|amount|how much|usd|\$/.test(q);
  const askElig = /eligib|who can|can i|requirement|criteria|allowed|age|student/.test(q);
  const askTime = /timeline|when|date|deadline|schedule|start|open|close|announce/.test(q);
  const askApply = /apply|application|how to|steps|proposal|join/.test(q);
  const any = askStipend || askElig || askTime || askApply;

  lines.push(i.summary);
  if (i.statusNote) lines.push(`**Status:** ${i.statusNote}`);
  if ((!any || askStipend) && i.stipend) {
    lines.push(`**Stipend:** ${i.stipend.headline}. ${i.stipend.detail}`);
    if (i.stipend.ranges?.length)
      lines.push(
        table(
          ["", "Amount"],
          i.stipend.ranges.map((r) => [r.label, r.value]),
        ),
      );
    if (i.stipend.payments?.length && askStipend)
      lines.push(
        table(
          ["Payment", "Share", "When"],
          i.stipend.payments.map((x) => [x.label, x.share ?? "", x.when ?? ""]),
        ),
      );
  }
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
  if (links.length)
    lines.push(
      `_Official sources (checked ${i.checked}): ${links
        .slice(0, 5)
        .map((l) => md(l.label, l.url))
        .join(" · ")}_`,
    );
  return lines.join("\n\n");
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

function orgList(
  k: Knowledge,
  q: string,
  p: KnowledgeProgram | null,
  tech: string | null,
  year: number | null,
): string | null {
  const found = searchOrgs(k, {
    program: p?.def.slug,
    technology: tech ?? undefined,
    year: year ?? undefined,
  });
  if (!found.length) return null;
  const scope = [p ? `in ${p.def.name}` : "", tech ? `using ${tech}` : "", year ? `in ${year}` : ""]
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

  const program = findProgram(k, raw);
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

  let mentioned = orgsMentioned(k, raw).filter(
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
    !(lfxSpecific && program?.def.slug === "lfx-mentorship" && !parts.length)
  ) {
    const org = mentioned[0]!;
    const isLfxMentorQ =
      /\bmentors?\b|mentored|who (mentors|guides)/.test(q) &&
      org.programs.some((e) => e.program === "lfx-mentorship");
    if (isLfxMentorQ && k.lfx) return withNote(lfxToMarkdown(answerQuestion(raw, k.lfx)));
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

  // 3. stipend, eligibility, timeline, how to apply
  if (
    program &&
    isProgramInfo &&
    !(program.def.slug === "lfx-mentorship" && /\bterm\b|t[123]\b/.test(q))
  )
    return withNote(programAnswer(program, q));

  // 4. CNCF LFX Mentorship history (terms, mentors, CNCF projects)
  if (k.lfx && (lfxSpecific || program?.def.slug === "lfx-mentorship")) {
    const a = answerQuestion(raw, k.lfx);
    if (a.kind !== "none" && a.kind !== "search") return withNote(lfxToMarkdown(a));
  }

  // 5. lists of organizations, by program and/or technology
  const tech = techIn(q);
  const listIntent = /\b(orgs?|organi[sz]ations?|projects|communities|list|which|show|all)\b/.test(
    q,
  );
  if ((program && listIntent) || tech) {
    const list = orgList(k, q, program, tech, year);
    if (list) return withNote(list);
  }
  if (program) return withNote(programAnswer(program, q));

  // 6. general open source questions with a known answer
  const faq = FAQ.find((f) => f.test.test(q));
  if (faq) return withNote(faq.answer);

  // 7. keyword search over organizations
  const found = searchOrgs(k, { query: raw }).slice(0, 12);
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
