import { assertNoContactData, scrubText } from "@opensourcex/shared";
import { excerpt, stripHtml } from "./types";

/**
 * CNCF LFX Mentorship history parser (docs/DATA_POLICY.md section 3).
 * Reads the per-term README files of github.com/cncf/mentoring (2019 onwards) and keeps an
 * ALLOWLIST only: term timeline, CNCF project, program title, short description, skills,
 * upstream issue, LFX project UUID, and mentor name + GitHub handle. Mentor emails, mentee
 * names and profile links are dropped. Output is verified with assertNoContactData.
 */
export interface CncfHistoryMentor {
  name: string;
  githubHandle: string | null;
}
export interface CncfHistoryProgram {
  cncfProject: string;
  title: string;
  lfxProjectUuid: string | null;
  upstreamIssueUrl: string | null;
  skills: string[];
  summary: string | null;
  mentors: CncfHistoryMentor[];
}
export interface CncfHistoryEvent {
  activity: string;
  dates: string;
}
export interface CncfHistoryTerm {
  year: number;
  termCode: "T1" | "T2" | "T3" | null;
  /** folder name in the source repository, e.g. "03-Sep-Nov" */
  folder: string;
  label: string;
  sourcePath: string;
  startsOn: string | null;
  endsOn: string | null;
  timeline: CncfHistoryEvent[];
  programs: CncfHistoryProgram[];
}
export interface CncfHistoryBody {
  sourceRef: string;
  terms: CncfHistoryTerm[];
}

const UUID = /\/project\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const HANDLE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const TERM_MONTHS = { T1: "Mar-May", T2: "Jun-Aug", T3: "Sep-Nov" } as const;

/** Headings that organize a README, never a CNCF project or a mentorship program. */
const SECTION =
  /^(timeline|table of contents|list of selected projects|participating projects?|accepted projects?|selected projects?|completed projects?|project ideas?|projects?|template|sample|project instructions|application instructions|status|mentorship duration|q[1-4]|summer|spring|fall|winter|term\b.*|\d{4}\b.*|.*\bterm\s*:.*|.*\b(spring|summer|fall)\b.*:.*)$/i;

export function termFromFolder(folder: string): "T1" | "T2" | "T3" | null {
  const f = folder.toLowerCase();
  if (/^01|spring|^q1$/.test(f)) return "T1";
  if (/^02|summer|^q2$/.test(f)) return "T2";
  if (/^03|fall|sep|^q3/.test(f)) return "T3";
  return null;
}

/** Plain text only: no links, markup, HTML, emails, or "@" mentions (handles live in their own field). */
const clean = (s: string) =>
  scrubText(
    stripHtml(s)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/(^|\s)>(?=\s|$)/g, " ") // blockquote markers
      .replace(/(^|\s)#{1,6}(?=\s)/g, " ") // heading markers inside text
      .replace(/^\s*description\s*:?\s*/i, "")
      .replace(/@/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );

const httpsUrl = (s: string | undefined) => {
  const m = s?.match(/https:\/\/[^\s)>\]]+/);
  return m ? m[0].replace(/[.,;]+$/, "").replace(/@/g, "%40") : null;
};

/** "Name (@handle, someone@example.com)", "Name (@handle)", "@handle" or a plain name. */
export function parseMentors(raw: string): CncfHistoryMentor[] {
  // drop emails first so "name@company.com" is never mistaken for a GitHub "@handle"
  const text = raw
    .replace(/mailto:\S+/gi, " ")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, " ")
    .replace(/\[([^\]]*)\]\(https:\/\/github\.com\/([^)/\s]+)\/?\)/g, "$1 (@$2)");
  const parts = text
    .split(/\n|;|,(?![^()]*\))|\band\b(?![^()]*\))|&(?![^()]*\))/)
    .map((p) => p.replace(/^\s*[-*]\s*/, "").trim())
    .filter(Boolean);
  const out: CncfHistoryMentor[] = [];
  for (const p of parts) {
    const handle = p.match(/@([A-Za-z0-9-]{1,39})\b/)?.[1] ?? null;
    let name = p
      .replace(/\(.*?\)/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/@[A-Za-z0-9-]+/g, "")
      .replace(/\S+@\S+/g, "");
    name = clean(name)
      .replace(/[()[\]]/g, "")
      .replace(/\s+-\s+(primary|secondary|backup)$/i, "")
      .replace(/[,:\-–\s]+$/, "")
      .trim();
    if (!name && handle) name = handle;
    if (!name || /^(tbd|n\/a|none)$/i.test(name) || name.length > 80) continue;
    out.push({ name, githubHandle: handle && HANDLE.test(handle) ? handle : null });
  }
  const seen = new Set<string>();
  return out.filter((m) => {
    const k = (m.githubHandle ?? m.name).toLowerCase();
    return seen.has(k) ? false : (seen.add(k), true);
  });
}

interface Heading {
  level: number;
  text: string;
  uuid: string | null;
  program?: boolean;
}

/** A labelled line: "- Mentor(s): ...", "Mentor(s):" (some terms omit the bullet) or "- Mentors". */
const KEY = /^\s?(?:[-*]\s+)?\**([A-Za-z][A-Za-z ()/'-]{1,40}?)\**\s*:\s*(.*)$/;
const BARE_MENTORS = /^\s?[-*]\s+\**(mentors?(?:\(s\))?)\**\s*()$/i;
const TOP_BULLET = /^\s?[-*]\s/;

function fieldKey(k: string): string | null {
  const s = k.toLowerCase();
  if (s.startsWith("description")) return "description";
  if (s.startsWith("recommended skill") || s === "skills") return "skills";
  if (s.startsWith("mentor")) return "mentors";
  if (s.startsWith("upstream issue") || s === "issue" || s.startsWith("upstream")) return "issue";
  if (
    s.startsWith("lfx url") ||
    s.startsWith("lfx project") ||
    s.startsWith("community bridge") ||
    s === "apply"
  )
    return "lfx";
  if (s.startsWith("expected outcome")) return "outcome";
  return null;
}

/** Splits the bullet block under a program heading into its labelled fields. */
function parseFields(lines: string[]): Record<string, string> {
  const f: Record<string, string> = {};
  let cur: string | null = null;
  for (const line of lines) {
    const m = line.match(KEY) ?? line.match(BARE_MENTORS);
    const key = m ? fieldKey(m[1]!) : null;
    if (key) {
      cur = key;
      f[key] = (f[key] ? f[key] + "\n" : "") + m![2];
    } else if (m && TOP_BULLET.test(line)) {
      cur = null; // another top-level label we do not keep (e.g. Mentee)
    } else if (cur && line.trim()) {
      f[cur] += "\n" + line.trim();
    }
  }
  return f;
}

function toProgram(cncfProject: string, h: Heading, f: Record<string, string>): CncfHistoryProgram {
  const lfx = f.lfx?.match(UUID)?.[1] ?? h.uuid;
  const skills = clean(f.skills ?? "")
    .split(/\bmentor/i)[0]!
    .split(/,|;|\band\b/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s && s.length <= 60)
    .slice(0, 15);
  return {
    cncfProject,
    title: clean(h.text).replace(/\s*\(20\d\d term \d\)\s*$/i, ""),
    lfxProjectUuid: lfx ? lfx.toLowerCase() : null,
    upstreamIssueUrl: httpsUrl(f.issue),
    skills,
    summary: excerpt(f.description ? clean(f.description) : null, 400),
    mentors: parseMentors(f.mentors ?? ""),
  };
}

/** Heading-structured READMEs (2020 Q2 onwards). */
function parseSections(md: string): CncfHistoryProgram[] {
  const lines = md.split(/\r?\n/);
  const out: CncfHistoryProgram[] = [];
  const stack: Heading[] = [];
  // a bare, non-section heading (e.g. "### in-toto") owns the programs that follow it as siblings
  let lastBare: Heading | null = null;
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*```/.test(line)) fence = !fence;
    if (fence) continue;
    const hm = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (!hm) continue;
    const h: Heading = {
      level: hm[1]!.length,
      text: hm[2]!,
      uuid: hm[2]!.match(UUID)?.[1] ?? null,
    };
    while (stack.length && stack[stack.length - 1]!.level >= h.level) stack.pop();
    const body: string[] = [];
    for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]!); j++) body.push(lines[j]!);
    const f = parseFields(body);
    const inTemplate = stack.some((s) => /^(template|sample)$/i.test(clean(s.text)));
    if (!inTemplate && (f.description || f.mentors) && !SECTION.test(clean(h.text))) {
      // CNCF project = first heading after the last organizing section among the ancestors
      const lastSection = stack.map((s) => SECTION.test(clean(s.text))).lastIndexOf(true);
      const owner = stack.slice(lastSection + 1).find((s) => !s.program) ?? lastBare;
      if (owner) out.push(toProgram(clean(owner.text), h, f));
      h.program = true;
    } else if (SECTION.test(clean(h.text))) {
      lastBare = null;
    } else if (!body.some((l) => l.trim())) {
      lastBare = h;
    }
    stack.push(h);
  }
  return out;
}

/** "| CNCF Projects | Community Bridge Project | Mentor Name(s) | Mentee Name |" tables (2019, 2020 Q1). */
function parseTables(md: string): CncfHistoryProgram[] {
  const out: CncfHistoryProgram[] = [];
  const rows = md.split(/\r?\n/).filter((l) => /^\s*\|/.test(l));
  let cols: string[] | null = null;
  for (const r of rows) {
    const cells = r
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const lower = cells.map((c) => clean(c).toLowerCase());
    if (lower.some((c) => c.startsWith("cncf project"))) {
      cols = lower;
      continue;
    }
    if (!cols) continue;
    const at = (re: RegExp) => cells[cols!.findIndex((c) => re.test(c))] ?? "";
    const project = clean(at(/^cncf project/));
    const title = at(/project$|community bridge/);
    if (!project || !title) continue;
    out.push({
      cncfProject: project,
      title: clean(title),
      lfxProjectUuid: title.match(UUID)?.[1]?.toLowerCase() ?? null,
      upstreamIssueUrl: null,
      skills: [],
      summary: null,
      mentors: parseMentors(at(/^mentor/)),
    });
  }
  return out;
}

/** The "Activity | Dates" timeline table, when the term has one. */
export function parseTimeline(md: string): CncfHistoryEvent[] {
  const out: CncfHistoryEvent[] = [];
  for (const l of md.split(/\r?\n/)) {
    if (!/^\s*\|/.test(l)) continue;
    const cells = l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => clean(c));
    if (cells.length < 2 || cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const [activity, dates] = cells as [string, string];
    if (/^activity$/i.test(activity) || /^dates?\b/i.test(dates)) continue;
    if (/^cncf project/i.test(activity)) return out; // a projects table, not a timeline
    if (activity && dates) out.push({ activity, dates });
  }
  return out;
}

/** First calendar date in free text such as "Mon, September 8" or "Tue, Nov 24, 18:00 UTC". */
export function firstDate(text: string, year: number): string | null {
  const m = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s*(20\d\d))?/i,
  );
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]!.toLowerCase()) + 1;
  const y = m[3] ? Number(m[3]) : year;
  return `${y}-${String(month).padStart(2, "0")}-${String(Number(m[2])).padStart(2, "0")}`;
}

function termWindow(timeline: CncfHistoryEvent[], year: number) {
  const find = (re: RegExp) => timeline.find((e) => re.test(e.activity));
  const begins = find(/program begins|work phase|coding begins|mentorship begins/i);
  const ends = find(/last day of term|program ends|term ends/i) ?? find(/final .*evaluation/i);
  return {
    startsOn: begins ? firstDate(begins.dates, year) : null,
    endsOn: ends ? firstDate(ends.dates, year) : null,
  };
}

/** Different spellings of the same CNCF project across terms. Keys are lower-case. */
const PROJECT_ALIASES: Record<string, string> = {
  kubearmor: "KubeArmor",
  kgateway: "kgateway",
  buildpacks: "Cloud Native Buildpacks",
  "headlamp (a kubernetes ui)": "Headlamp",
  krkn: "Krkn",
  "krkn - chaos": "Krkn",
  "the update framework (tuf)": "TUF",
  "wasmedge runtime": "WasmEdge",
  "kubernetes policy working group (wg)": "Kubernetes",
  "project rekor": "Rekor",
  "cncf tag network and observability": "CNCF TAG Network",
  "cncf tag contributor strategy - ii": "CNCF TAG Contributor Strategy",
  "volcano/kthena": "Volcano",
  "volcano/agentcube": "Volcano",
  "cilium/tetragon": "Cilium",
  "opentelemetry php": "OpenTelemetry",
  "knative functions": "Knative",
  "jaeger & linkerd": "Jaeger",
};

export function canonicalProject(name: string): string {
  return PROJECT_ALIASES[name.toLowerCase()] ?? name;
}

export interface TermFile {
  year: number;
  folder: string;
  path: string;
  markdown: string;
}

/** One term = the README plus any selected_projects.md in the same folder. */
export function parseTerm(files: TermFile[]): CncfHistoryTerm {
  const readme = files.find((f) => /readme\.md$/i.test(f.path)) ?? files[0]!;
  const { year, folder } = readme;
  const termCode = termFromFolder(folder);
  const programs = files
    .flatMap((f) => [...parseTables(f.markdown), ...parseSections(f.markdown)])
    .map((p) => ({ ...p, cncfProject: canonicalProject(p.cncfProject) }));
  const seen = new Set<string>();
  const unique = programs.filter((p) => {
    const k = `${p.cncfProject.toLowerCase()}|${p.title.toLowerCase()}`;
    return seen.has(k) ? false : (seen.add(k), true);
  });
  const timeline = parseTimeline(readme.markdown);
  return {
    year,
    termCode,
    folder,
    label: termCode ? `${year} Term ${termCode.slice(1)} (${TERM_MONTHS[termCode]})` : `${year}`,
    sourcePath: readme.path,
    ...termWindow(timeline, year),
    timeline,
    programs: unique,
  };
}

export function buildCncfHistory(sourceRef: string, terms: TermFile[][]): CncfHistoryBody {
  const body: CncfHistoryBody = {
    sourceRef,
    terms: terms
      .map(parseTerm)
      .sort((a, b) => a.year - b.year || (a.termCode ?? "").localeCompare(b.termCode ?? "")),
  };
  assertNoContactData(body);
  return body;
}
