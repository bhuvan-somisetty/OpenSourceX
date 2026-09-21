export type GithubRefKind =
  "repo" | "org" | "issue" | "pull" | "other-github" | "not-github" | "invalid";

export interface GithubRef {
  kind: GithubRefKind;
  owner: string | null;
  repo: string | null;
  number: number | null;
  /** Lower-cased canonical https URL of the repository or organization, when known. */
  canonicalUrl: string | null;
}

const RESERVED = new Set([
  "orgs",
  "settings",
  "marketplace",
  "sponsors",
  "topics",
  "features",
  "about",
  "login",
]);
const NAME = /^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9_])?$/;

/**
 * Parse a URL into a GitHub reference. This is URL parsing only: it does not prove the
 * repository exists, its id, or that it was not renamed. Stable ids come from the GitHub API (M3).
 */
export function parseGithubUrl(input: string | null | undefined): GithubRef {
  const none = (kind: GithubRefKind): GithubRef => ({
    kind,
    owner: null,
    repo: null,
    number: null,
    canonicalUrl: null,
  });
  if (!input) return none("invalid");
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return none("invalid");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return none("invalid");
  if (!/^(www\.)?github\.com$/i.test(u.hostname)) return none("not-github");
  const parts = u.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  if (!owner || RESERVED.has(owner.toLowerCase()) || !NAME.test(owner)) return none("other-github");
  const orgUrl = `https://github.com/${owner.toLowerCase()}`;
  if (parts.length === 1)
    return { kind: "org", owner, repo: null, number: null, canonicalUrl: orgUrl };
  const repo = (parts[1] ?? "").replace(/\.git$/i, "");
  if (!NAME.test(repo)) return none("other-github");
  const canonicalUrl = `${orgUrl}/${repo.toLowerCase()}`;
  const ref = { owner, repo, canonicalUrl };
  const seg = parts[2];
  const num = Number(parts[3]);
  if ((seg === "issues" || seg === "pull") && Number.isInteger(num)) {
    return { kind: seg === "pull" ? "pull" : "issue", ...ref, number: num };
  }
  return { kind: "repo", ...ref, number: null };
}
