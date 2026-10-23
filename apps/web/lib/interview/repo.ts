import { listProjects } from "@opensourcex/database";
import { knowledge } from "@/lib/assistant/engine";
import { githubRepo, repoSlug } from "@/lib/assistant/live";
import { db } from "@/lib/data";
import { tidyTechnologies, type InterviewProject } from "./coach";

/**
 * "Which programs is this repository in?" A pasted GitHub link is matched against every recorded
 * organization and its projects, so the interview can be about the code the candidate actually
 * works on. Three kinds of match, strongest first:
 *  - "repository": the organization's own records name this exact repository
 *  - "project": one of its recorded projects names this repository (or the one it was forked from)
 *  - "organization": the repository sits in the organization's own GitHub organization account.
 *    A personal account never counts: a person's other repositories are not the organization's.
 */
export interface RepoProject {
  /** set for LFX Mentorship projects, which the interview can be about directly */
  id: string | null;
  title: string;
  program: string;
  /** when it ran, newest first, e.g. "2026 Term 1 (Mar-May)" or "2026" */
  when: string[];
  url: string | null;
  technologies: string[];
}

export interface RepoOrgMatch {
  name: string;
  matchedBy: "repository" | "project" | "organization";
  description: string | null;
  logo: string | null;
  logoOnDark: boolean;
  /** slug for the CNCF/LFX logo set, when there is no program logo */
  logoSlug: string;
  pageUrl: string;
  programs: { name: string; years: number[]; pageUrl: string }[];
  technologies: string[];
  /** this organization's recorded projects on this repository */
  projects: RepoProject[];
}

export interface RepoMatch {
  slug: string;
  url: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number | null;
  forks: number | null;
  license: string | null;
  lastPush: string | null;
  /** "owner/repo" this repository was forked from */
  forkOf: string | null;
  /** false when GitHub could not be reached; recorded matches still work */
  live: boolean;
  technologies: string[];
  orgs: RepoOrgMatch[];
  /** LFX Mentorship projects on this repository, for picking one as the interview subject */
  projects: { id: string; name: string; program: string; org: string | null; when: string[] }[];
}

const ghParts = (url: string | null | undefined): { owner: string; repo: string | null } | null => {
  const m = url?.match(
    /github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+?))?(?:\.git)?(?:[/#?]|$)/i,
  );
  return m ? { owner: m[1]!.toLowerCase(), repo: m[2]?.toLowerCase() ?? null } : null;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const RANK = { repository: 0, project: 1, organization: 2 } as const;

/** One row per project title: the same idea offered in several terms is listed once. */
function mergeProjects(list: RepoProject[]): RepoProject[] {
  const by = new Map<string, RepoProject>();
  for (const p of list) {
    const k = `${norm(p.program)}|${norm(p.title)}`;
    const cur = by.get(k);
    if (!cur) by.set(k, { ...p, when: [...p.when] });
    else {
      cur.when = [...new Set([...cur.when, ...p.when])];
      cur.id ??= p.id;
      cur.url ??= p.url;
      cur.technologies = [...new Set([...cur.technologies, ...p.technologies])];
    }
  }
  return [...by.values()]
    .map((p) => ({ ...p, when: [...p.when].sort().reverse() }))
    .sort((a, b) => (b.when[0] ?? "").localeCompare(a.when[0] ?? ""));
}

const cache = new Map<string, { at: number; data: RepoMatch }>();
const TTL_MS = 30 * 60_000;

export async function matchRepo(input: string): Promise<RepoMatch | null> {
  const slug = repoSlug(input.replace(/^https?:\/\/(www\.)?/i, ""));
  if (!slug || !/github\.com\/|^[\w.-]+\/[\w.-]+$/i.test(input.trim())) return null;
  const key = slug.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

  const [gh, k, cards] = await Promise.all([
    githubRepo(slug).catch(() => null),
    knowledge(),
    listProjects(db())
      .then((r) => r.items)
      .catch(() => []),
  ]);

  // the repository itself, and the one it was forked from: a project on the original counts
  const targets = [key, gh?.repository?.toLowerCase(), gh?.forkOf?.toLowerCase()]
    .filter((x): x is string => !!x)
    .filter((x, i, a) => a.indexOf(x) === i)
    .map((x) => x.split("/") as [string, string]);
  const isTarget = (u: string | null | undefined) => {
    const g = ghParts(u);
    return !!g?.repo && targets.some(([o, r]) => o === g.owner && r === g.repo);
  };
  const owner = targets[0]![0];
  const orgAccount = gh?.ownerType === "Organization";

  const orgs = new Map<string, RepoOrgMatch>();
  const sibling = new Set<string>();
  const add = (
    o: (typeof k.orgs)[number],
    matchedBy: RepoOrgMatch["matchedBy"],
    projects: RepoProject[],
  ) => {
    const cur = orgs.get(o.key);
    if (cur) {
      if (RANK[matchedBy] < RANK[cur.matchedBy]) cur.matchedBy = matchedBy;
      cur.projects.push(...projects);
      return;
    }
    const programs = new Map<string, { name: string; years: number[]; pageUrl: string }>();
    for (const e of o.programs) {
      const p = programs.get(e.programName);
      if (p) p.years = [...new Set([...p.years, ...e.years])].sort();
      else
        programs.set(e.programName, {
          name: e.programName,
          years: [...e.years].sort(),
          pageUrl: e.pageUrl,
        });
    }
    orgs.set(o.key, {
      name: o.name,
      matchedBy,
      description: o.description,
      logo: o.logo ?? null,
      logoOnDark: !!o.logoOnDark,
      logoSlug: o.lfxSlug ?? o.key.replace(/ /g, "-"),
      pageUrl: o.programs[0]!.pageUrl,
      programs: [...programs.values()],
      technologies: tidyTechnologies(o.tags, 8),
      projects: [...projects],
    });
  };

  for (const o of k.orgs) {
    const own = [o.repoUrl, o.githubUrl, ...o.programs.flatMap((e) => e.links.map((l) => l.url))];
    const projects: RepoProject[] = o.programs.flatMap((e) =>
      e.projects
        .filter((p) => isTarget(p.url) || (p.repos ?? []).some(isTarget))
        .map((p) => ({
          id: null,
          title: p.title,
          program: e.programName,
          when: p.year ? [String(p.year)] : [],
          url: p.url ?? null,
          technologies: [],
        })),
    );
    if (own.some(isTarget)) add(o, "repository", projects);
    else if (projects.length) add(o, "project", projects);
    else if (orgAccount) {
      const same = own.map(ghParts).filter((g) => g?.owner === owner);
      if (same.length) {
        add(o, "organization", []);
        // recorded only through another repository of the same account
        if (same.every((g) => g!.repo)) sibling.add(o.key);
      }
    }
  }

  // LFX Mentorship projects carry their own repository and terms
  const lfx = cards.filter((c) => c.kind === "mentorship" && isTarget(c.repoUrl));
  const byName = new Map(k.orgs.map((o) => [norm(o.name), o]));
  const lfxProject = (c: (typeof lfx)[number]): RepoProject => ({
    id: c.id,
    title: c.name,
    program: c.program.name,
    when: c.terms.filter((t) => !t.startsWith("unmapped")),
    url: null,
    technologies: tidyTechnologies(c.technologies, 6),
  });
  for (const c of lfx) {
    const o = c.org ? byName.get(norm(c.org)) : undefined;
    if (o) add(o, "project", [lfxProject(c)]);
  }

  // when some organization records this exact repository, organizations that only share its
  // GitHub account through another repository are not shown (kube-state-metrics is not
  // kubernetes/kubernetes)
  const exact = [...orgs.values()].some((o) => o.matchedBy !== "organization");
  const list = [...orgs.entries()]
    .filter(([key, o]) => !(exact && o.matchedBy === "organization" && sibling.has(key)))
    .map(([, o]) => ({ ...o, projects: mergeProjects(o.projects) }))
    .sort((a, b) => RANK[a.matchedBy] - RANK[b.matchedBy] || b.projects.length - a.projects.length);

  if (!gh && !list.length && !lfx.length) return null;

  const projects = mergeProjects(lfx.map(lfxProject))
    .slice(0, 12)
    .map((p) => ({
      id: p.id!,
      name: p.title,
      program: p.program,
      org: lfx.find((c) => c.id === p.id)?.org ?? null,
      when: p.when,
    }));

  const data: RepoMatch = {
    slug: gh?.repository ?? slug,
    url: gh?.url ?? `https://github.com/${slug}`,
    name: (gh?.repository ?? slug).split("/")[1]!,
    description: gh?.description ?? null,
    language: gh?.language ?? null,
    topics: gh?.topics ?? [],
    stars: gh?.stars ?? null,
    forks: gh?.forks ?? null,
    license: gh?.license && gh.license !== "NOASSERTION" ? gh.license : null,
    lastPush: gh?.lastPush ?? null,
    forkOf: gh?.forkOf ?? null,
    live: !!gh,
    technologies: tidyTechnologies(
      [
        gh?.language ?? "",
        ...(gh?.topics.slice(0, 6) ?? []),
        ...(list[0]?.projects.flatMap((p) => p.technologies).slice(0, 4) ?? []),
        ...(list[0]?.technologies.slice(0, 4) ?? []),
      ].filter(Boolean),
      10,
    ),
    orgs: list.slice(0, 6),
    projects,
  };
  if (cache.size > 300) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data;
}

export function repoInterviewProject(m: RepoMatch): InterviewProject {
  const org = m.orgs[0];
  return {
    id: `repo:${m.slug}`,
    name: m.slug,
    org: org?.name ?? m.slug.split("/")[0]!,
    program: org?.programs.map((p) => p.name).join(", ") || "open source",
    summary: m.description,
    technologies: m.technologies,
    repoUrl: m.url,
    mentors: [],
  };
}
