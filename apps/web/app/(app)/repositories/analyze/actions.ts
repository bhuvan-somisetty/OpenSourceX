"use server";

import { listProjects, savedKeys, type ProjectCard } from "@opensourcex/database";
import { getSession } from "@/lib/auth";
import { interviewAiAvailable, spendAi } from "@/lib/interview/ai";
import { explainFromData, explainWithAi, type RepoExplanation } from "@/lib/repo-explain";
import { parseGithubUrl } from "@opensourcex/entity-resolution";
import { db } from "@/lib/data";
import { knowledge } from "@/lib/assistant/engine";
import type { KnowledgeOrg } from "@/lib/assistant/knowledge";
import { liveApisEnabled } from "@/lib/assistant/live";
import {
  analyzeGithubRepository,
  GithubLimitError,
  isNotFound,
  listRepoDirectory,
  readmeText,
  type RepoAnalysis,
  type RepoDirEntry,
} from "@/lib/repo-analysis";

/** What OpenSourceX itself records about the repository's organization. */
export interface RepoInOpenSourceX {
  org: {
    name: string;
    programs: { name: string; page: string; years: number[] }[];
    chats: { platform: string; workspace: string; joinUrl: string; channels?: string[] }[];
  } | null;
  /** LFX Mentorship programs whose issue link points into this repository. */
  mentorships: { title: string; term: string; url: string | null; page: string }[];
}

export interface AnalyzeResult {
  state: "invalid" | "org" | "repo";
  message: string;
  owner?: string;
  repo?: string;
  canonical?: string;
  note?: string;
  recorded: Pick<ProjectCard, "id" | "name" | "program">[];
  saved?: boolean;
  analysis?: RepoAnalysis;
  /** why the live analysis is missing: off, rate limit, not found or an error */
  analysisError?: string;
  inOpenSourceX?: RepoInOpenSourceX;
}

async function inOpenSourceX(owner: string, repo: string): Promise<RepoInOpenSourceX> {
  const k = await knowledge();
  const login = owner.toLowerCase();
  const full = `${login}/${repo.toLowerCase()}`;
  const ghLogin = (u: string | null) =>
    u?.match(/github\.com\/(?:orgs\/)?([^/?#]+)/i)?.[1]?.toLowerCase();
  const byRepo = (o: KnowledgeOrg) =>
    [o.repoUrl, o.githubUrl].some((u) =>
      u?.toLowerCase().replace(/\/$/, "").endsWith(`github.com/${full}`),
    );
  const byOwner = (o: KnowledgeOrg) => [o.repoUrl, o.githubUrl].some((u) => ghLogin(u) === login);
  const org = k.orgs.find(byRepo) ?? k.orgs.find(byOwner) ?? null;
  const label = (key: string) => k.lfx?.terms.find((t) => t.key === key)?.label ?? key;
  const mentorships = (k.lfx?.programs ?? [])
    .filter(
      (p) =>
        p.upstreamUrl?.toLowerCase().includes(`github.com/${full}/`) ||
        p.upstreamUrl?.toLowerCase().endsWith(`github.com/${full}`),
    )
    .map((p) => ({
      title: p.title,
      term: label(p.terms.at(-1) ?? ""),
      url: p.lfxUrl ?? p.upstreamUrl,
      page: `/projects/${p.id}`,
      sort: p.terms.at(-1) ?? "",
    }))
    .sort((a, b) => b.sort.localeCompare(a.sort))
    .map(({ sort: _sort, ...m }) => m);
  return {
    org: org
      ? {
          name: org.name,
          programs: org.programs.map((e) => ({
            name: e.programName,
            page: e.pageUrl,
            years: e.years,
          })),
          chats: org.chats.map((c) => ({
            platform: c.platform,
            workspace: c.workspace,
            joinUrl: c.joinUrl,
            channels: c.channels,
          })),
        }
      : null,
    mentorships,
  };
}

/** Validates a GitHub URL (SSRF-safe: parsed and rebuilt, never fetched) and looks it up in recorded data only. */
export async function analyzeRepository(input: string): Promise<AnalyzeResult> {
  // accept "owner/repo" and "github.com/owner/repo" as well as full URLs
  const raw = input.trim();
  const withHost = /^(www\.)?github\.com\//i.test(raw)
    ? `https://${raw}`
    : /^[A-Za-z0-9][\w.-]*\/[\w.-]+\/?$/.test(raw)
      ? `https://github.com/${raw}`
      : raw;
  const ref = parseGithubUrl(withHost);
  const none = { recorded: [] };
  if (ref.kind === "not-github")
    return { state: "invalid", message: "Only github.com repository URLs are supported.", ...none };
  if (ref.kind === "invalid" || ref.kind === "other-github")
    return {
      state: "invalid",
      message:
        "That does not look like a GitHub repository URL. Example: https://github.com/owner/repo",
      ...none,
    };
  if (ref.kind === "org")
    return {
      state: "org",
      message:
        "That is an organization URL. Enter a repository, for example https://github.com/owner/repo.",
      owner: ref.owner ?? undefined,
      ...none,
    };
  let recorded: AnalyzeResult["recorded"];
  try {
    const all = await listProjects(db());
    recorded = all.items
      .filter((p) => p.repoUrl && p.repoUrl === ref.canonicalUrl)
      .map((p) => ({ id: p.id, name: p.name, program: p.program }));
  } catch {
    recorded = [];
  }
  const session = await getSession();
  let saved = false;
  try {
    if (session && ref.canonicalUrl)
      saved = (await savedKeys(db(), session.userId)).has(`REPOSITORY:${ref.canonicalUrl}`);
  } catch {
    saved = false;
  }
  let analysis: RepoAnalysis | undefined;
  let analysisError: string | undefined;
  if (!liveApisEnabled()) analysisError = "Live GitHub analysis is switched off on this server.";
  else if (ref.owner && ref.repo)
    try {
      analysis = await analyzeGithubRepository(ref.owner, ref.repo);
    } catch (e) {
      analysisError =
        e instanceof GithubLimitError
          ? `GitHub's free request limit for this site is used up for now${e.resetAt ? `; it resets at ${e.resetAt.slice(11, 16)} UTC` : ""}. Please try again later.`
          : isNotFound(e)
            ? "GitHub has no public repository at this address. Check the spelling, or it may be private."
            : "GitHub did not answer in time. Please try again in a moment.";
    }
  let found: RepoInOpenSourceX | undefined;
  try {
    if (ref.owner && ref.repo) found = await inOpenSourceX(ref.owner, ref.repo);
  } catch {
    found = undefined;
  }
  return {
    saved,
    analysis,
    analysisError,
    inOpenSourceX: found,
    state: "repo",
    message: "Valid GitHub repository URL.",
    owner: ref.owner ?? undefined,
    repo: ref.repo ?? undefined,
    canonical: ref.canonicalUrl ?? undefined,
    note:
      ref.kind === "issue" || ref.kind === "pull"
        ? `Repository derived from a ${ref.kind} URL.`
        : undefined,
    recorded,
  };
}

/** One folder of a repository for the structure tree; empty when it cannot be read. */
export async function listDirectory(
  owner: string,
  repo: string,
  ref: string,
  dir: string,
): Promise<RepoDirEntry[]> {
  const name = /^[A-Za-z0-9_.-]{1,100}$/;
  if (!name.test(owner) || !name.test(repo) || !/^[\w./-]{1,200}$/.test(ref)) return [];
  if (!/^[^\0]{1,400}$/.test(dir) || dir.split("/").some((p) => p === ".." || p === "")) return [];
  try {
    return await listRepoDirectory(owner, repo, ref, dir);
  } catch {
    return [];
  }
}

const explained = new Map<string, { at: number; data: RepoExplanation }>();
const EXPLAIN_MS = 24 * 60 * 60_000;

/**
 * "What is this project, why use it, what does it run on, and what do I need to know?" Written
 * by the AI from the README and GitHub facts for a signed-in session while free AI calls last,
 * otherwise put together from GitHub's data. AI explanations are kept for a day per repository.
 */
export async function explainRepository(slug: string): Promise<RepoExplanation | null> {
  const m = slug.match(/^([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100})$/);
  if (!m) return null;
  const [, owner, repo] = m as unknown as [string, string, string];
  const key = slug.toLowerCase();
  const hit = explained.get(key);
  if (hit && Date.now() - hit.at < EXPLAIN_MS) return hit.data;
  let analysis: RepoAnalysis;
  try {
    analysis = await analyzeGithubRepository(owner, repo);
  } catch {
    return null;
  }
  const session = await getSession();
  if (session && interviewAiAvailable() && spendAi(`explain:${session.userId}`)) {
    try {
      const data = await explainWithAi(analysis, await readmeText(owner, repo));
      if (explained.size > 300) explained.clear();
      explained.set(key, { at: Date.now(), data });
      return data;
    } catch {
      /* the data-only explanation below */
    }
  }
  return explainFromData(analysis);
}
