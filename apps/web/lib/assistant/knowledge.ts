import type { LfxHistory } from "@opensourcex/database";
import { orgCommunity, type OrgChat } from "@/lib/org-community";
import { programData, type ProgramData } from "@/lib/program-data";
import { programInfo, type ProgramInfo } from "@/lib/program-info";
import { CNCF_NAME, lfxFoundations, type FoundationsFile } from "@/lib/lfx-foundations";
import { PROGRAM_CATALOG, type ProgramDef } from "@/lib/programs";

/**
 * One searchable index over everything OpenSourceX records: every program's organizations
 * (committed snapshots), the CNCF LFX Mentorship history (database) and each program's
 * stipend/eligibility/timeline file. Both answer engines (offline and AI tools) read only this,
 * so every link they give comes from recorded data, never from a guess.
 */
export interface OrgProgramEntry {
  program: string;
  /** the organization's slug inside this program (its page is /programs/<program>/organizations/<orgSlug>) */
  orgSlug: string;
  programName: string;
  years: number[];
  /** LFX only: term keys such as "2025-T3" */
  terms?: string[];
  projectCount: number;
  projects: { title: string; year: number | null; url?: string }[];
  pageUrl: string;
  links: { label: string; url: string }[];
  /** LFX only: the Linux Foundation project it belongs to, e.g. "CNCF" or "LFDT" */
  foundation?: string;
}

export interface KnowledgeOrg {
  key: string;
  name: string;
  description: string | null;
  website: string | null;
  repoUrl: string | null;
  githubUrl: string | null;
  tags: string[];
  chats: OrgChat[];
  chatSource: string | null;
  /** logo file under public/logos (program orgs), null when none was published */
  logo?: string | null;
  logoOnDark?: boolean;
  categories?: string[];
  /** LFX/CNCF organization slug, used by the existing LFX logo set */
  lfxSlug?: string;
  programs: OrgProgramEntry[];
}

export interface KnowledgeProgram {
  def: ProgramDef;
  info: ProgramInfo | null;
  orgCount: number;
  years: number[];
  pageUrl: string;
  sources: { label: string; url: string }[];
}

export interface Knowledge {
  orgs: KnowledgeOrg[];
  programs: KnowledgeProgram[];
  lfx: LfxHistory | null;
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();

const uniq = <T>(xs: T[]) => [...new Set(xs)];

let staticCache: Promise<{
  data: ProgramData[];
  info: Map<string, ProgramInfo | null>;
  foundations: FoundationsFile | null;
}> | null = null;

function loadStatic() {
  staticCache ??= (async () => {
    const data: ProgramData[] = [];
    const info = new Map<string, ProgramInfo | null>();
    for (const def of PROGRAM_CATALOG) {
      const d = await programData(def.slug);
      if (d) data.push(d);
      info.set(def.slug, await programInfo(def.slug));
    }
    const foundations: FoundationsFile | null = await lfxFoundations().catch(() => null);
    return { data, info, foundations };
  })();
  return staticCache;
}

function mergeChats(a: OrgChat[], b: OrgChat[]): OrgChat[] {
  const out = [...a];
  for (const c of b)
    if (!out.some((x) => x.joinUrl === c.joinUrl && x.channelUrl === c.channelUrl)) out.push(c);
  return out;
}

export async function buildKnowledge(lfx: LfxHistory | null): Promise<Knowledge> {
  const { data, info, foundations } = await loadStatic();
  const byKey = new Map<string, KnowledgeOrg>();
  const upsert = (
    name: string,
    patch: Omit<KnowledgeOrg, "key" | "name" | "programs">,
    entry: OrgProgramEntry,
  ) => {
    const key = normalize(name);
    const cur = byKey.get(key);
    if (!cur) {
      byKey.set(key, { key, name, ...patch, programs: [entry] });
      return;
    }
    cur.description ??= patch.description;
    cur.website ??= patch.website;
    cur.repoUrl ??= patch.repoUrl;
    cur.githubUrl ??= patch.githubUrl;
    cur.chatSource ??= patch.chatSource;
    cur.logo ??= patch.logo;
    cur.logoOnDark ??= patch.logoOnDark;
    cur.lfxSlug ??= patch.lfxSlug;
    cur.categories = uniq([...(cur.categories ?? []), ...(patch.categories ?? [])]);
    cur.tags = uniq([...cur.tags, ...patch.tags]);
    cur.chats = mergeChats(cur.chats, patch.chats);
    cur.programs.push(entry);
  };

  const programs: KnowledgeProgram[] = [];
  for (const def of PROGRAM_CATALOG) {
    const d = data.find((x) => x.program === def.slug);
    if (d) {
      for (const o of d.orgs)
        upsert(
          o.name,
          {
            description: o.description ?? o.tagline,
            website: o.website,
            repoUrl: o.repoUrl ?? o.sourceCodeUrl ?? null,
            githubUrl: o.githubUrl ?? null,
            tags: o.tags ?? [],
            chats: o.chats ?? [],
            chatSource: o.chatSource ?? null,
            logo: o.logo ?? null,
            logoOnDark: o.logoOnDark,
            categories: o.categories ?? [],
          },
          {
            program: def.slug,
            orgSlug: o.slug,
            programName: def.name,
            years: o.years,
            projectCount: o.projects?.length ?? 0,
            projects: (o.projects ?? []).map((p) => ({ title: p.title, year: p.year, url: p.url })),
            pageUrl: `/programs/${def.alias}/organizations/${encodeURIComponent(o.slug)}`,
            links: o.links ?? [],
          },
        );
      programs.push({
        def,
        info: info.get(def.slug) ?? null,
        orgCount: d.orgs.length,
        years: d.years,
        pageUrl: `/programs/${def.alias}`,
        sources: d.sources,
      });
      continue;
    }
    let foundationOrgCount = 0;
    if (def.slug === "lfx-mentorship" && foundations) {
      for (const f of foundations.foundations)
        for (const o of f.orgs) {
          foundationOrgCount++;
          upsert(
            o.name,
            {
              description: o.description,
              website: o.website,
              repoUrl: o.repoUrl,
              githubUrl: o.githubUrl ?? null,
              tags: o.tags,
              chats: o.chats ?? [],
              chatSource: o.chatSource ?? null,
              logo: o.logo,
              categories: o.categories ?? [f.name],
            },
            {
              program: def.slug,
              orgSlug: o.slug,
              programName: `LFX Mentorship (${f.short === "More" ? o.lfProject : f.name})`,
              foundation: f.short === "More" ? "More" : f.short,
              years: o.years,
              projectCount: o.projects?.length ?? 0,
              projects: (o.projects ?? []).map((x) => ({
                title: x.title,
                year: x.year,
                url: x.url,
              })),
              pageUrl: `/programs/lfx/organizations/${encodeURIComponent(o.slug)}`,
              links: o.links ?? [],
            },
          );
        }
    }
    if (def.slug === "lfx-mentorship" && lfx?.programs.length) {
      const groups = new Map<string, LfxHistory["programs"]>();
      for (const p of lfx.programs)
        groups.set(p.cncfProject, [...(groups.get(p.cncfProject) ?? []), p]);
      for (const [name, ps] of groups) {
        const slug =
          ps.find((p) => p.cncfProjectSlug)?.cncfProjectSlug ?? normalize(name).replace(/ /g, "-");
        const community = orgCommunity(slug);
        const terms = uniq(ps.flatMap((p) => p.terms)).sort();
        upsert(
          name,
          {
            description: null,
            website: null,
            repoUrl: community?.repoUrl ?? null,
            githubUrl: null,
            tags: uniq(ps.flatMap((p) => p.skills)).slice(0, 25),
            chats: community?.chats ?? [],
            chatSource: community?.source ?? null,
            lfxSlug: slug,
            categories: [CNCF_NAME],
          },
          {
            program: def.slug,
            orgSlug: slug,
            programName: "LFX Mentorship (CNCF)",
            foundation: "CNCF",
            years: uniq(terms.map((t) => Number(t.slice(0, 4)))).sort(),
            terms,
            projectCount: ps.length,
            projects: ps
              .map((p) => ({
                title: p.title,
                year: Number(p.terms.at(-1)?.slice(0, 4)) || null,
                url: p.lfxUrl ?? p.upstreamUrl ?? undefined,
              }))
              .sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
            pageUrl: `/programs/lfx/organizations/${encodeURIComponent(slug)}`,
            links: [],
          },
        );
      }
      const projects = new Set(lfx.programs.map((p) => p.cncfProject));
      programs.push({
        def,
        info: info.get(def.slug) ?? null,
        orgCount: projects.size + foundationOrgCount,
        years: uniq(lfx.terms.map((t) => t.year)).sort(),
        pageUrl: "/programs/lfx",
        sources: [
          { label: "CNCF mentoring repository", url: lfx.source.url },
          ...(foundations?.sources.slice(0, 1) ?? []),
        ],
      });
      continue;
    }
    programs.push({
      def,
      info: info.get(def.slug) ?? null,
      orgCount: 0,
      years: [],
      pageUrl: `/programs/${def.alias}`,
      sources: [],
    });
  }
  return { orgs: [...byKey.values()], programs, lfx };
}

/* ---------- lookups shared by both engines ---------- */

const GENERIC_SUFFIX =
  /\b(foundation|project|projects|organization|organisation|org|inc|community|software|the|team|labs?)\b/g;
/** Org names that are also ordinary words; only matched when the whole question is about them. */
const COMMON_WORDS = new Set(
  "open source code data web python rust go git linux cloud ai ml art music science time chat docs test tests apache mozilla processing community api".split(
    " ",
  ),
);

function aliases(o: KnowledgeOrg): string[] {
  const base = o.key;
  const stripped = base.replace(GENERIC_SUFFIX, " ").replace(/\s+/g, " ").trim();
  const out = [base];
  if (stripped.length >= 4 && stripped !== base) out.push(stripped);
  // "LF Energy (LFE)" is asked about as "LF Energy"
  const bare = normalize(o.name.replace(/\s*\([^)]*\)/g, " "));
  if (bare.length >= 4 && bare !== base) out.push(bare);
  for (const u of [o.repoUrl, o.githubUrl]) {
    const m = u?.match(/github\.com\/(?:orgs\/)?([^/?#]+)/i);
    if (m && m[1]!.length >= 4) out.push(normalize(m[1]!));
  }
  return uniq(out);
}

const aliasCache = new WeakMap<Knowledge, { alias: string; org: KnowledgeOrg }[]>();
function aliasIndex(k: Knowledge) {
  let idx = aliasCache.get(k);
  if (!idx) {
    idx = k.orgs
      .flatMap((org) => aliases(org).map((alias) => ({ alias, org })))
      .sort((a, b) => b.alias.length - a.alias.length);
    aliasCache.set(k, idx);
  }
  return idx;
}

const has = (text: string, phrase: string) => ` ${text} `.includes(` ${phrase} `);

/** Organizations named in free text, longest name first. */
export function orgsMentioned(k: Knowledge, text: string): KnowledgeOrg[] {
  const t = normalize(text);
  const found: KnowledgeOrg[] = [];
  let rest = ` ${t} `;
  for (const { alias, org } of aliasIndex(k)) {
    if (alias.length < 3) continue;
    if (COMMON_WORDS.has(alias) && t !== alias) continue;
    if (has(rest.trim(), alias) && !found.includes(org)) {
      found.push(org);
      rest = rest.replace(` ${alias} `, " ");
    }
  }
  return found;
}

/** Best organization for a name typed by a user or a model. */
export function findOrg(
  k: Knowledge,
  name: string,
): { org: KnowledgeOrg | null; candidates: KnowledgeOrg[] } {
  const n = normalize(name);
  if (!n) return { org: null, candidates: [] };
  const exact = aliasIndex(k)
    .filter((a) => a.alias === n)
    .map((a) => a.org);
  if (exact.length) return { org: exact[0]!, candidates: uniq(exact).slice(1, 6) };
  const mentioned = orgsMentioned(k, name);
  if (mentioned.length) return { org: mentioned[0]!, candidates: mentioned.slice(1, 6) };
  // names are already matched word-for-word above; here only a typed prefix of a longer name
  const partial =
    n.length >= 3 ? k.orgs.filter((o) => o.key.startsWith(n) || o.key.includes(` ${n}`)) : [];
  partial.sort((a, b) => a.key.length - b.key.length);
  return { org: partial[0] ?? null, candidates: partial.slice(1, 6) };
}

export function findProgram(k: Knowledge, text: string): KnowledgeProgram | null {
  return findProgramMatch(k, text)?.p ?? null;
}

/** The program named in free text and the words that named it ("summer of bitcoin"). */
export function findProgramMatch(
  k: Knowledge,
  text: string,
): { p: KnowledgeProgram; key: string } | null {
  const t = normalize(text);
  const names = k.programs.flatMap((p) => {
    const keys = [
      p.def.slug.replace(/-/g, " "),
      normalize(p.def.name),
      normalize(p.def.short),
      p.def.alias.replace(/-/g, " "),
    ];
    if (p.def.slug === "gsoc") keys.push("gsoc", "google summer of code", "summer of code");
    if (p.def.slug === "lfx-mentorship")
      keys.push("lfx", "linux foundation mentorship", "lfx mentorship", "cncf mentorship");
    if (p.def.slug === "season-of-docs") keys.push("gsod", "google season of docs");
    if (p.def.slug === "european-summer-of-code") keys.push("esoc");
    if (p.def.slug === "ospp") keys.push("open source promotion plan", "summer of open source");
    if (p.def.slug === "c4gt") keys.push("code for gov tech", "c4gt dmp");
    if (p.def.slug === "mlh-fellowship") keys.push("mlh", "major league hacking");
    return uniq(keys)
      .filter((x) => x.length >= 3)
      .map((key) => ({ key, p }));
  });
  names.sort((a, b) => b.key.length - a.key.length);
  return names.find((x) => has(t, x.key)) ?? null;
}

const QUERY_STOP = new Set(
  "a an and are about any can could do does for from give get give have how i in is it link links list me my of on or org orgs organization organizations please show tell the their them to url what which with repo repos repository github slack discord chat channel website".split(
    " ",
  ),
);

export interface OrgSearch {
  query?: string;
  program?: string;
  technology?: string;
  year?: number;
  minYears?: number;
}

export function searchOrgs(k: Knowledge, s: OrgSearch): KnowledgeOrg[] {
  const prog = s.program ? (findProgram(k, s.program)?.def.slug ?? s.program) : null;
  const tech = s.technology ? normalize(s.technology) : null;
  const words = s.query
    ? normalize(s.query)
        .split(" ")
        .filter((w) => w.length > 1 && !QUERY_STOP.has(w))
    : [];
  if (s.query && !words.length) return [];
  return k.orgs
    .map((o) => {
      const entries = o.programs.filter((e) => !prog || e.program === prog);
      if (!entries.length) return null;
      if (s.year && !entries.some((e) => e.years.includes(s.year!))) return null;
      const years = uniq(entries.flatMap((e) => e.years));
      if (s.minYears && years.length < s.minYears) return null;
      if (tech && !o.tags.some((t) => normalize(t) === tech || normalize(t).includes(tech)))
        return null;
      let score = 1;
      if (words.length) {
        const text = normalize(`${o.name} ${o.description ?? ""} ${o.tags.join(" ")}`);
        score = words.reduce((n, w) => n + (has(o.key, w) ? 4 : has(text, w) ? 1 : 0), 0);
        if (!score) return null;
      }
      return { o, score: score * 100 + years.length * 3 + o.programs.length };
    })
    .filter((x): x is { o: KnowledgeOrg; score: number } => !!x)
    .sort((a, b) => b.score - a.score || a.o.name.localeCompare(b.o.name))
    .map((x) => x.o);
}

/** Organizations that keep coming back: most years inside one program, or most programs overall. */
export function recurringOrgs(k: Knowledge, program?: string | null, limit = 30) {
  const prog = program ? (findProgram(k, program)?.def.slug ?? program) : null;
  return k.orgs
    .map((o) => {
      const entries = o.programs.filter((e) => !prog || e.program === prog);
      const years = uniq(entries.flatMap((e) => e.years)).sort();
      const terms = uniq(entries.flatMap((e) => e.terms ?? []));
      return { org: o, years, terms, programs: uniq(entries.map((e) => e.programName)) };
    })
    .filter((r) => r.years.length > 0)
    .sort(
      (a, b) =>
        (prog ? 0 : b.programs.length - a.programs.length) ||
        b.terms.length - a.terms.length ||
        b.years.length - a.years.length ||
        a.org.name.localeCompare(b.org.name),
    )
    .slice(0, limit);
}

/** Compact, model-friendly view of an organization. */
export function orgSummary(o: KnowledgeOrg, full = false) {
  return {
    name: o.name,
    description: o.description,
    website: o.website,
    repository: o.repoUrl,
    github: o.githubUrl,
    chats: o.chats.map((c) => ({
      platform: c.platform,
      workspace: c.workspace,
      joinUrl: c.joinUrl,
      channels: c.channels,
      channelUrl: c.channelUrl,
    })),
    chatSource: o.chatSource,
    technologies: o.tags.slice(0, full ? 25 : 8),
    programs: o.programs.map((e) => ({
      program: e.programName,
      years: e.years,
      terms: e.terms,
      projects: e.projectCount,
      page: e.pageUrl,
      ...(full ? { links: e.links, recentProjects: e.projects.slice(0, 12) } : {}),
    })),
  };
}
