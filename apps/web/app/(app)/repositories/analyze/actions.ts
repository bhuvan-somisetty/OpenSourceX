"use server";

import { listProjects, savedKeys, type ProjectCard } from "@opensourcex/database";
import { getSession } from "@/lib/auth";
import { parseGithubUrl } from "@opensourcex/entity-resolution";
import { db } from "@/lib/data";

export interface AnalyzeResult {
  state: "invalid" | "org" | "repo";
  message: string;
  owner?: string;
  repo?: string;
  canonical?: string;
  note?: string;
  recorded: Pick<ProjectCard, "id" | "name" | "program">[];
  saved?: boolean;
}

/** Validates a GitHub URL (SSRF-safe: parsed and rebuilt, never fetched) and looks it up in recorded data only. */
export async function analyzeRepository(input: string): Promise<AnalyzeResult> {
  const ref = parseGithubUrl(input.trim());
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
  return {
    saved,
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
