import type { HistoryProgram, HistoryTerm, LfxHistory } from "@opensourcex/database";

/**
 * Deterministic question answering over the recorded CNCF LFX Mentorship history.
 * No AI and no guessing: every number is counted from the data, and every answer names the
 * README(s) it came from. Questions it cannot ground in the data get an honest "not found".
 */
export interface ProgramRef {
  id: string;
  title: string;
  cncfProject: string;
  term: string;
  mentors: string[];
  lfxUrl: string | null;
}
export interface Answer {
  kind:
    | "project"
    | "project-mentors"
    | "mentor"
    | "recurring"
    | "term"
    | "timeline"
    | "year"
    | "skill"
    | "overview"
    | "search"
    | "none";
  title: string;
  summary: string;
  table?: { columns: string[]; rows: string[][] };
  programs?: ProgramRef[];
  sources: { label: string; url: string }[];
  suggestions?: string[];
}

export const EXAMPLE_QUESTIONS = [
  "Which CNCF projects repeat in every LFX term?",
  "How many times has Jaeger been in LFX Mentorship?",
  "Who mentors Kyverno?",
  "What is the timeline for 2026 Term 3?",
  "Which LFX projects use Rust?",
  "What did @yurishkuro mentor?",
  "Show 2025 Term 1 projects",
];

const MAX_PROGRAMS = 40;
const TERM_NAMES: Record<string, "T1" | "T2" | "T3"> = {
  "1": "T1",
  "2": "T2",
  "3": "T3",
  first: "T1",
  second: "T2",
  third: "T3",
  spring: "T1",
  summer: "T2",
  fall: "T3",
  autumn: "T3",
};
/** Common short names people type for CNCF projects. */
const PROJECT_SYNONYMS: Record<string, string> = {
  k8s: "Kubernetes",
  otel: "OpenTelemetry",
  cnpg: "CloudNativePG",
  smp: "Service Mesh Performance",
  litmus: "LitmusChaos",
  kube: "Kubernetes",
};
/** Skills whose names are also ordinary English words; only matched in a skill context. */
const AMBIGUOUS_SKILLS = new Set(["go", "c", "r", "ui", "ux", "ai", "ml", "api", "apis", "design"]);
const SKILL_SYNONYMS: Record<string, string> = { golang: "go", js: "javascript", ts: "typescript" };

const lower = (s: string) => s.toLowerCase();
const words = (s: string) => lower(s).replace(/[^a-z0-9+#.@ -]/g, " ");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, w: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRe(lower(w))}($|[^a-z0-9])`).test(text);

export function termLabel(key: string, terms: HistoryTerm[]): string {
  return terms.find((t) => t.key === key)?.label ?? (key === "2019" ? "2019 (pilot year)" : key);
}

function termStatus(t: HistoryTerm, today: string): "ended" | "in progress" | "upcoming" | null {
  if (!t.startsOn || !t.endsOn) return null;
  if (t.endsOn < today) return "ended";
  if (t.startsOn <= today) return "in progress";
  return "upcoming";
}

export interface ParsedQuestion {
  year: number | null;
  termCode: "T1" | "T2" | "T3" | null;
  relative: "next" | "current" | "latest" | null;
  project: string | null;
  mentor: { name: string; github: string } | null;
  skill: string | null;
  intents: Set<"recurring" | "timeline" | "mentor" | "count" | "overview">;
}

export function parseQuestion(question: string, h: LfxHistory): ParsedQuestion {
  const q = words(question);
  const year = Number(q.match(/\b(2019|20[2-3]\d)\b/)?.[1]) || null;
  const tm =
    q.match(/\bterm\s*0?([123])\b/) ??
    q.match(/\bt0?([123])\b/) ??
    q.match(/\b(first|second|third)\s+term\b/) ??
    q.match(/\b(spring|summer|fall|autumn)\b/);
  let termCode = tm ? (TERM_NAMES[tm[1]!] ?? null) : null;
  if (!termCode) {
    if (/\bmar(ch)?\s*-?\s*may\b/.test(q)) termCode = "T1";
    else if (/\bjune?\s*-?\s*aug(ust)?\b/.test(q)) termCode = "T2";
    else if (/\bsep(t|tember)?\s*-?\s*nov(ember)?\b/.test(q)) termCode = "T3";
  }
  const relative = /\b(next|upcoming|coming)\b/.test(q)
    ? "next"
    : /\b(current|ongoing|this term|now|running)\b/.test(q)
      ? "current"
      : /\b(latest|last|recent|newest)\b/.test(q)
        ? "latest"
        : null;

  const names = [...new Set(h.programs.map((p) => p.cncfProject))].sort(
    (a, b) => b.length - a.length,
  );
  let project = names.find((n) => hasWord(q, n)) ?? null;
  if (!project)
    for (const [k, v] of Object.entries(PROJECT_SYNONYMS))
      if (hasWord(q, k) && names.includes(v)) project = v;

  const handle = q.match(/@([a-z0-9-]{1,39})\b/)?.[1];
  const allMentors = h.programs.flatMap((p) => p.mentors);
  const mentor =
    (handle && allMentors.find((m) => lower(m.github) === handle)) ||
    allMentors
      .filter((m) => m.name.includes(" "))
      .sort((a, b) => b.name.length - a.name.length)
      .find((m) => hasWord(q, m.name)) ||
    null;

  const skillContext = /\b(use|uses|using|with|skill|skills|language|written|stack|in)\b/.test(q);
  const skillSet = new Map<string, string>();
  for (const p of h.programs) for (const s of p.skills) skillSet.set(lower(s), s);
  let skill: string | null = null;
  for (const [k, v] of Object.entries(SKILL_SYNONYMS))
    if (hasWord(q, k) && skillSet.has(v)) skill = v;
  if (!skill)
    skill =
      [...skillSet.keys()]
        .filter((s) => s.length >= 2 && s.length <= 25)
        .filter((s) => !AMBIGUOUS_SKILLS.has(s) || skillContext)
        .filter((s) => !project || !lower(project).includes(s))
        .sort((a, b) => b.length - a.length)
        .find((s) => hasWord(q, s)) ?? null;

  const intents = new Set<ParsedQuestion["intents"] extends Set<infer T> ? T : never>();
  if (
    /\b(every|each|all)\s+(term|terms|time|year)\b|repeat|recurr|again|consisten|regular|most (often|active|frequent|times|terms)|many terms|multiple terms|top projects?|frequently|returning/.test(
      q,
    )
  )
    intents.add("recurring");
  if (
    /timeline|\bwhen\b|\bdates?\b|deadline|apply|application|stipend|kick ?off|evaluation|selection|schedule|\bbegins?\b|\bstarts?\b|\bends?\b|open/.test(
      q,
    )
  )
    intents.add("timeline");
  // "mentor"/"mentored", never "mentorship"
  if (/\bmentor(s|ed|ing)?\b|\bwho\b|\bguides?\b/.test(q)) intents.add("mentor");
  if (/how many|\bcount|number of|times/.test(q)) intents.add("count");
  if (/\boverview|\bstats|statistics|summary|in total|overall/.test(q)) intents.add("overview");
  return { year, termCode, relative, project, mentor, skill, intents };
}

const ref = (p: HistoryProgram, terms: HistoryTerm[], key?: string): ProgramRef => ({
  id: p.id,
  title: p.title,
  cncfProject: p.cncfProject,
  term: (key ? [key] : p.terms).map((k) => termLabel(k, terms)).join(", "),
  mentors: p.mentors.map((m) => `${m.name} (@${m.github})`),
  lfxUrl: p.lfxUrl,
});

function termSources(keys: string[], h: LfxHistory) {
  const out = keys
    .map((k) => h.terms.find((t) => t.key === k))
    .filter((t): t is HistoryTerm => !!t?.sourceUrl)
    .map((t) => ({ label: `${t.label} README`, url: t.sourceUrl! }));
  return out.length > 6
    ? [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }]
    : out.length
      ? out
      : [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }];
}

/** Terms that actually list programs (a term still in planning has none yet). */
const activeTermKeys = (h: LfxHistory) =>
  [...new Set(h.programs.flatMap((p) => p.terms))].sort((a, b) => a.localeCompare(b));

function pickTerm(pq: ParsedQuestion, h: LfxHistory, today: string): HistoryTerm | null {
  if (pq.year && pq.termCode)
    return h.terms.find((t) => t.year === pq.year && t.termCode === pq.termCode) ?? null;
  if (pq.relative === "next") return h.terms.find((t) => t.startsOn && t.startsOn > today) ?? null;
  if (pq.relative === "current")
    return (
      h.terms.find((t) => termStatus(t, today) === "in progress") ??
      h.terms.find((t) => t.startsOn && t.startsOn > today) ??
      null
    );
  if (pq.relative === "latest") {
    const keys = activeTermKeys(h);
    return h.terms.find((t) => t.key === keys[keys.length - 1]) ?? null;
  }
  return null;
}

function projectHistory(pq: ParsedQuestion, h: LfxHistory, today: string): Answer {
  const name = pq.project!;
  const own = h.programs.filter((p) => p.cncfProject === name);
  const allKeys = activeTermKeys(h);
  const keys = [...new Set(own.flatMap((p) => p.terms))].sort();
  const term = pickTerm(pq, h, today);
  const scoped = term
    ? own.filter((p) => p.terms.includes(term.key))
    : pq.year
      ? own.filter((p) => p.terms.some((k) => k.startsWith(String(pq.year))))
      : own;

  if (pq.intents.has("mentor")) {
    const counts = new Map<string, { m: { name: string; github: string }; terms: Set<string> }>();
    for (const p of scoped)
      for (const m of p.mentors) {
        const k = lower(m.github);
        const cur = counts.get(k) ?? { m, terms: new Set<string>() };
        p.terms.forEach((t) => cur.terms.add(t));
        counts.set(k, cur);
      }
    const rows = [...counts.values()].sort(
      (a, b) => b.terms.size - a.terms.size || a.m.name.localeCompare(b.m.name),
    );
    const scope = term ? ` in ${term.label}` : pq.year ? ` in ${pq.year}` : "";
    return {
      kind: "project-mentors",
      title: `${name} mentors${scope}`,
      summary: rows.length
        ? `${rows.length} official mentor${rows.length === 1 ? "" : "s"} listed for ${name}${scope} across ${scoped.length} program${scoped.length === 1 ? "" : "s"}.`
        : `No mentors with a GitHub handle are listed for ${name}${scope}.`,
      table: {
        columns: ["Mentor", "GitHub", "Terms mentored"],
        rows: rows.map((r) => [
          r.m.name,
          `@${r.m.github}`,
          [...r.terms]
            .sort()
            .map((k) => termLabel(k, h.terms))
            .join(", "),
        ]),
      },
      sources: termSources(term ? [term.key] : keys, h),
    };
  }

  const first = keys[0],
    last = keys[keys.length - 1];
  const since = allKeys.filter((k) => first && k >= first);
  const missed = since.filter((k) => !keys.includes(k));
  const streakEnd = allKeys.length - 1;
  let streak = 0;
  for (let i = streakEnd; i >= 0 && keys.includes(allKeys[i]!); i--) streak++;
  const scope = term ? ` in ${term.label}` : pq.year ? ` in ${pq.year}` : "";
  const summary =
    term || pq.year
      ? `${name} had ${scoped.length} LFX Mentorship program${scoped.length === 1 ? "" : "s"}${scope}.` +
        ` Overall it took part in ${keys.length} of ${allKeys.length} CNCF terms.`
      : `${name} took part in ${keys.length} of ${allKeys.length} CNCF LFX Mentorship terms, with ${own.length} program${own.length === 1 ? "" : "s"} in total.` +
        ` First: ${termLabel(first!, h.terms)}. Latest: ${termLabel(last!, h.terms)}.` +
        (missed.length
          ? ` Since joining it skipped ${missed.length} term${missed.length === 1 ? "" : "s"}.`
          : " It has not missed a single term since it first joined.") +
        (streak > 1 ? ` It is in each of the last ${streak} terms.` : "");
  return {
    kind: "project",
    title: `${name} in LFX Mentorship${scope}`,
    summary,
    table: term
      ? undefined
      : {
          columns: ["Term", "Programs", "Titles"],
          rows: keys
            .filter((k) => !pq.year || k.startsWith(String(pq.year)))
            .map((k) => {
              const ps = own.filter((p) => p.terms.includes(k));
              return [termLabel(k, h.terms), String(ps.length), ps.map((p) => p.title).join("; ")];
            }),
        },
    programs: scoped.slice(0, MAX_PROGRAMS).map((p) => ref(p, h.terms)),
    sources: termSources(term ? [term.key] : keys, h),
  };
}

function mentorHistory(pq: ParsedQuestion, h: LfxHistory): Answer {
  const m = pq.mentor!;
  const own = h.programs.filter((p) => p.mentors.some((x) => lower(x.github) === lower(m.github)));
  const keys = [...new Set(own.flatMap((p) => p.terms))].sort();
  const projects = [...new Set(own.map((p) => p.cncfProject))];
  return {
    kind: "mentor",
    title: `${m.name} (@${m.github})`,
    summary: `${m.name} is listed as an official mentor on ${own.length} CNCF LFX Mentorship program${own.length === 1 ? "" : "s"} across ${keys.length} term${keys.length === 1 ? "" : "s"}, for ${projects.join(", ")}.`,
    programs: own.slice(0, MAX_PROGRAMS).map((p) => ref(p, h.terms)),
    sources: termSources(keys, h),
  };
}

function recurring(h: LfxHistory, pq: ParsedQuestion): Answer {
  const allKeys = activeTermKeys(h).filter((k) => !pq.year || k.startsWith(String(pq.year)));
  const by = new Map<string, Set<string>>();
  const programs = new Map<string, number>();
  for (const p of h.programs)
    for (const k of p.terms) {
      if (!allKeys.includes(k)) continue;
      by.set(p.cncfProject, (by.get(p.cncfProject) ?? new Set()).add(k));
      programs.set(p.cncfProject, (programs.get(p.cncfProject) ?? 0) + 1);
    }
  const ranked = [...by.entries()]
    .map(([name, ks]) => ({ name, keys: [...ks].sort(), n: programs.get(name)! }))
    .sort((a, b) => b.keys.length - a.keys.length || b.n - a.n || a.name.localeCompare(b.name));
  // "every term" is measured over the regular three-terms-a-year era (2021 onwards)
  const regular = allKeys.filter((k) => k >= "2021");
  const everyTerm = ranked.filter((r) => regular.every((k) => r.keys.includes(k)));
  const recent = allKeys.slice(-6);
  const allRecent = ranked.filter((r) => recent.every((k) => r.keys.includes(k)));
  const scope = pq.year ? ` in ${pq.year}` : "";
  return {
    kind: "recurring",
    title: `CNCF projects that keep coming back to LFX Mentorship${scope}`,
    summary:
      (everyTerm.length
        ? `${everyTerm.length} project${everyTerm.length === 1 ? "" : "s"} appeared in every one of the ${regular.length} terms since 2021: ${everyTerm.map((r) => r.name).join(", ")}. `
        : `No single project appeared in all ${regular.length} terms since 2021. `) +
      `In each of the last ${recent.length} terms (${termLabel(recent[0]!, h.terms)} to ${termLabel(recent[recent.length - 1]!, h.terms)}): ${allRecent.map((r) => r.name).join(", ") || "none"}. ` +
      `${ranked.length} CNCF projects have taken part in total.`,
    table: {
      columns: ["CNCF project", "Terms", "Programs", "First term", "Latest term"],
      rows: ranked
        .slice(0, 30)
        .map((r) => [
          r.name,
          `${r.keys.length} of ${allKeys.length}`,
          String(r.n),
          termLabel(r.keys[0]!, h.terms),
          termLabel(r.keys[r.keys.length - 1]!, h.terms),
        ]),
    },
    sources: [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }],
  };
}

function termAnswer(t: HistoryTerm, pq: ParsedQuestion, h: LfxHistory, today: string): Answer {
  const own = h.programs.filter((p) => p.terms.includes(t.key));
  const status = termStatus(t, today);
  const dates =
    t.startsOn && t.endsOn
      ? ` It runs ${t.startsOn} to ${t.endsOn}${status ? ` (${status})` : ""}.`
      : "";
  if (pq.intents.has("timeline") && t.timeline.length) {
    return {
      kind: "timeline",
      title: `${t.label} timeline`,
      summary: `Official timeline for CNCF in LFX Mentorship ${t.label}.${dates}`,
      table: { columns: ["Activity", "Dates"], rows: t.timeline.map((e) => [e.activity, e.dates]) },
      sources: termSources([t.key], h),
    };
  }
  const per = new Map<string, number>();
  for (const p of own) per.set(p.cncfProject, (per.get(p.cncfProject) ?? 0) + 1);
  return {
    kind: "term",
    title: `${t.label}`,
    summary: own.length
      ? `${t.label} lists ${own.length} CNCF mentorship programs from ${per.size} CNCF projects.${dates}`
      : `${t.label} has no selected programs listed yet${status === "upcoming" ? " (the term is still being planned)" : ""}.${dates}`,
    table: own.length
      ? {
          columns: ["CNCF project", "Programs"],
          rows: [...per.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([n, c]) => [n, String(c)]),
        }
      : t.timeline.length
        ? { columns: ["Activity", "Dates"], rows: t.timeline.map((e) => [e.activity, e.dates]) }
        : undefined,
    programs: own.slice(0, MAX_PROGRAMS).map((p) => ref(p, h.terms, t.key)),
    sources: termSources([t.key], h),
  };
}

function yearAnswer(year: number, h: LfxHistory): Answer {
  const keys = activeTermKeys(h).filter((k) => k.startsWith(String(year)));
  const rows = keys.map((k) => {
    const ps = h.programs.filter((p) => p.terms.includes(k));
    return [
      termLabel(k, h.terms),
      String(ps.length),
      String(new Set(ps.map((p) => p.cncfProject)).size),
    ];
  });
  const total = new Set(
    h.programs.filter((p) => p.terms.some((k) => keys.includes(k))).map((p) => p.id),
  ).size;
  return {
    kind: "year",
    title: `CNCF in LFX Mentorship, ${year}`,
    summary: keys.length
      ? `${year} had ${keys.length} term${keys.length === 1 ? "" : "s"} with ${total} CNCF mentorship programs in total.`
      : `No CNCF LFX Mentorship programs are recorded for ${year}.`,
    table: rows.length ? { columns: ["Term", "Programs", "CNCF projects"], rows } : undefined,
    sources: termSources(keys, h),
  };
}

function skillAnswer(pq: ParsedQuestion, h: LfxHistory): Answer {
  const s = pq.skill!;
  const spellings = h.programs.flatMap((p) => p.skills).filter((x) => lower(x) === s);
  const pretty = spellings.find((x) => x !== lower(x)) ?? spellings[0] ?? s;
  const own = h.programs.filter(
    (p) =>
      p.skills.some((x) => lower(x) === s) &&
      (!pq.year || p.terms.some((k) => k.startsWith(String(pq.year)))) &&
      (!pq.project || p.cncfProject === pq.project),
  );
  const per = new Map<string, number>();
  for (const p of own) per.set(p.cncfProject, (per.get(p.cncfProject) ?? 0) + 1);
  const scope = pq.year ? ` in ${pq.year}` : "";
  return {
    kind: "skill",
    title: `LFX Mentorship programs needing ${pretty}${scope}`,
    summary: `${own.length} CNCF mentorship program${own.length === 1 ? "" : "s"}${scope} list ${pretty} as a recommended skill, across ${per.size} CNCF project${per.size === 1 ? "" : "s"}.`,
    table: {
      columns: ["CNCF project", "Programs"],
      rows: [...per.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([n, c]) => [n, String(c)]),
    },
    programs: [...own]
      .sort((a, b) => (b.terms.at(-1) ?? "").localeCompare(a.terms.at(-1) ?? ""))
      .slice(0, MAX_PROGRAMS)
      .map((p) => ref(p, h.terms)),
    sources: [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }],
  };
}

function overview(h: LfxHistory, today: string): Answer {
  const keys = activeTermKeys(h);
  const projects = new Set(h.programs.map((p) => p.cncfProject));
  const mentors = new Set(h.programs.flatMap((p) => p.mentors.map((m) => lower(m.github))));
  const next = h.terms.find((t) => t.startsOn && t.startsOn > today);
  return {
    kind: "overview",
    title: "CNCF in LFX Mentorship at a glance",
    summary:
      `${h.programs.length} mentorship programs from ${projects.size} CNCF projects across ${keys.length} terms (${termLabel(keys[0]!, h.terms)} to ${termLabel(keys[keys.length - 1]!, h.terms)}), with ${mentors.size} distinct official mentors.` +
      (next ? ` Next term: ${next.label}, starting ${next.startsOn}.` : ""),
    table: {
      columns: ["Term", "Programs", "CNCF projects"],
      rows: keys.map((k) => {
        const ps = h.programs.filter((p) => p.terms.includes(k));
        return [
          termLabel(k, h.terms),
          String(ps.length),
          String(new Set(ps.map((p) => p.cncfProject)).size),
        ];
      }),
    },
    sources: [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }],
  };
}

const STOP = new Set(
  "a an and are about any can cncf did do does for from has have how i in is it lfx list me mentorship of on or program programs project projects show tell the there to was were what which with".split(
    " ",
  ),
);

function search(question: string, h: LfxHistory, pq: ParsedQuestion): Answer {
  const terms = words(question)
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  const scored = h.programs
    .filter((p) => !pq.year || p.terms.some((k) => k.startsWith(String(pq.year))))
    .map((p) => {
      const text = lower(`${p.title} ${p.summary ?? ""} ${p.skills.join(" ")} ${p.cncfProject}`);
      const title = lower(p.title);
      return {
        p,
        score: terms.reduce((n, w) => n + (hasWord(title, w) ? 3 : hasWord(text, w) ? 1 : 0), 0),
      };
    })
    .filter((x) => x.score > 0 && terms.length)
    .sort(
      (a, b) => b.score - a.score || (b.p.terms.at(-1) ?? "").localeCompare(a.p.terms.at(-1) ?? ""),
    );
  if (!scored.length)
    return {
      kind: "none",
      title: "No answer in the recorded data",
      summary:
        "I could not find this in the CNCF LFX Mentorship history. Try naming a CNCF project, a term (for example 2025 Term 2), a mentor's GitHub handle or a skill.",
      sources: [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }],
      suggestions: EXAMPLE_QUESTIONS.slice(0, 4),
    };
  return {
    kind: "search",
    title: `Programs matching "${terms.join(" ")}"`,
    summary: `${scored.length} CNCF mentorship program${scored.length === 1 ? "" : "s"} mention ${terms.map((t) => `"${t}"`).join(", ")} in the title, description or skills.`,
    programs: scored.slice(0, MAX_PROGRAMS).map((x) => ref(x.p, h.terms)),
    sources: [{ label: "CNCF mentoring repository, LFX Mentorship terms", url: h.source.url }],
  };
}

export function answerQuestion(
  question: string,
  h: LfxHistory,
  today = new Date().toISOString().slice(0, 10),
): Answer {
  const q = question.trim().slice(0, 300);
  if (!q || !h.programs.length) return overview(h, today);
  const pq = parseQuestion(q, h);
  if (pq.mentor && !pq.project) return mentorHistory(pq, h);
  if (pq.project && !pq.skill) return projectHistory(pq, h, today);
  if (pq.intents.has("recurring")) return recurring(h, pq);
  const term = pickTerm(pq, h, today);
  if (term) return termAnswer(term, pq, h, today);
  if (pq.skill) return skillAnswer(pq, h);
  if (pq.year) return yearAnswer(pq.year, h);
  if (pq.intents.has("timeline")) {
    const next =
      h.terms.find((t) => termStatus(t, today) === "in progress") ??
      h.terms.find((t) => t.startsOn && t.startsOn > today);
    if (next) return termAnswer(next, { ...pq, intents: new Set(["timeline"]) }, h, today);
  }
  if (pq.intents.has("overview") || pq.intents.has("count")) return overview(h, today);
  return search(q, h, pq);
}
