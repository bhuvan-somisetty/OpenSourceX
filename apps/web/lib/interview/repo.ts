import { listProjects } from "@opensourcex/database";
import { knowledge } from "@/lib/assistant/engine";
import { githubRepo, repoSlug } from "@/lib/assistant/live";
import { db } from "@/lib/data";
import { tidyTechnologies, type InterviewProject } from "./coach";

/**
 * "Which programs is this repository in?" A pasted GitHub link is matched against every recorded
 * organization (repository, GitHub account, project and idea links) and every mentorship project,
 * so the interview can be about the code the candidate actually works on.
 */
export interface RepoOrgMatch {
  name: string;
  /** "repository": this exact repository is recorded; "organization": same GitHub account */
  matchedBy: "repository" | "organization";
  description: string | null;
  logo: string | null;
  logoOnDark: boolean;
  /** slug for the CNCF/LFX logo set, when there is no program logo */
  logoSlug: string;
  pageUrl: string;
  programs: { name: string; years: number[]; pageUrl: string }[];
  technologies: string[];
}

export interface RepoMatch {
  slug: string;
  url: string;
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  stars: number | null;
  license: string | null;
  /** false when GitHub could not be reached; recorded matches still work */
  live: boolean;
  technologies: string[];
  orgs: RepoOrgMatch[];
  projects: { id: string; name: string; program: string; org: string | null }[];
}

const ghParts = (url: string | null | undefined): { owner: string; repo: string | null } | null => {
  const m = url?.match(
    /github\.com\/([A-Za-z0-9_.-]+)(?:\/([A-Za-z0-9_.-]+?))?(?:\.git)?(?:[/#?]|$)/i,
  );
  return m ? { owner: m[1]!.toLowerCase(), repo: m[2]?.toLowerCase() ?? null } : null;
};

const cache = new Map<string, { at: number; data: RepoMatch }>();
const TTL_MS = 30 * 60_000;

export async function matchRepo(input: string): Promise<RepoMatch | null> {
  const slug = repoSlug(input.replace(/^https?:\/\/(www\.)?/i, ""));
  if (!slug || !/github\.com\/|^[\w.-]+\/[\w.-]+$/i.test(input.trim())) return null;
  const key = slug.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const [owner, repo] = key.split("/") as [string, string];

  const [gh, k, cards] = await Promise.all([
    githubRepo(slug).catch(() => null),
    knowledge(),
    listProjects(db())
      .then((r) => r.items)
      .catch(() => []),
  ]);

  const orgs: RepoOrgMatch[] = [];
  for (const o of k.orgs) {
    const urls = [
      o.repoUrl,
      o.githubUrl,
      ...o.programs.flatMap((e) => [...e.links.map((l) => l.url), ...e.projects.map((p) => p.url)]),
    ];
    let matchedBy: RepoOrgMatch["matchedBy"] | null = null;
    for (const u of urls) {
      const g = ghParts(u);
      if (!g || g.owner !== owner) continue;
      if (g.repo === repo) {
        matchedBy = "repository";
        break;
      }
      matchedBy = "organization";
    }
    if (!matchedBy) continue;
    const programs = new Map<string, { name: string; years: number[]; pageUrl: string }>();
    for (const e of o.programs) {
      const cur = programs.get(e.programName);
      if (cur) cur.years = [...new Set([...cur.years, ...e.years])].sort();
      else
        programs.set(e.programName, {
          name: e.programName,
          years: [...e.years].sort(),
          pageUrl: e.pageUrl,
        });
    }
    orgs.push({
      name: o.name,
      matchedBy,
      description: o.description,
      logo: o.logo ?? null,
      logoOnDark: !!o.logoOnDark,
      logoSlug: o.lfxSlug ?? o.key.replace(/ /g, "-"),
      pageUrl: o.programs[0]!.pageUrl,
      programs: [...programs.values()],
      technologies: tidyTechnologies(o.tags, 8),
    });
  }
  orgs.sort((a, b) => (a.matchedBy === b.matchedBy ? 0 : a.matchedBy === "repository" ? -1 : 1));

  const projects = cards
    .filter((c) => c.kind === "mentorship")
    .filter((c) => {
      const g = ghParts(c.repoUrl);
      return g?.owner === owner && (!g.repo || g.repo === repo);
    })
    .slice(0, 12)
    .map((c) => ({ id: c.id, name: c.name, program: c.program.name, org: c.org }));

  if (!gh && !orgs.length && !projects.length) return null;

  const data: RepoMatch = {
    slug: gh?.repository ?? slug,
    url: gh?.url ?? `https://github.com/${slug}`,
    name: (gh?.repository ?? slug).split("/")[1]!,
    description: gh?.description ?? orgs[0]?.description ?? null,
    language: gh?.language ?? null,
    topics: gh?.topics ?? [],
    stars: gh?.stars ?? null,
    license: gh?.license ?? null,
    live: !!gh,
    technologies: tidyTechnologies(
      [
        gh?.language ?? "",
        ...(orgs[0]?.technologies.slice(0, 5) ?? []),
        ...(gh?.topics.slice(0, 6) ?? []),
      ].filter(Boolean),
      10,
    ),
    orgs: orgs.slice(0, 8),
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
