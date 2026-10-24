import { createLogger } from "@opensourcex/shared";

/**
 * Live analysis of one public GitHub repository, read-only, from the GitHub REST API. Every
 * figure comes straight from GitHub and is shown with its source; nothing is scored (D-010).
 * Each section loads on its own, so one failing call never hides the others. Results are cached
 * per server instance for 30 minutes to stay inside GitHub's free limits; a GITHUB_TOKEN raises
 * the hourly limit from 60 to 5,000 requests. One analysis uses about 13 regular requests and
 * 2 searches.
 */
const log = createLogger("repo-analysis");
const GH = "https://api.github.com";
const TIMEOUT_MS = 8_000;
const CACHE_MS = 30 * 60_000;
const DAY = 86_400_000;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export class GithubLimitError extends Error {
  constructor(public resetAt: string | null) {
    super("GitHub rate limit reached");
  }
}
class NotFoundError extends Error {}

async function gh<T>(path: string): Promise<{ data: T; link: string | null }> {
  const headers: Record<string, string> = {
    "user-agent": "OpenSourceX (repository analysis)",
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${GH}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new NotFoundError(path);
  if (
    res.status === 429 ||
    (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0")
  ) {
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    throw new GithubLimitError(reset ? new Date(reset * 1000).toISOString() : null);
  }
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path.split("?")[0]}`);
  const text = (await res.text()).replace(EMAIL, "[email removed]");
  return { data: JSON.parse(text) as T, link: res.headers.get("link") };
}

/** The number of items behind a paginated list, read from its `rel="last"` link. */
function countFrom(link: string | null, pageItems: number, perPage: number): number {
  const m = link?.match(/[?&]page=(\d+)>; rel="last"/);
  return m ? (Number(m[1]) - 1) * perPage + 1 : pageItems;
}

export type Section<T> = { ok: true; data: T } | { ok: false; error: string };

export function limitMessage(e: GithubLimitError) {
  return `GitHub's free request limit for this site is used up for now${e.resetAt ? `; it resets at ${e.resetAt.slice(11, 16)} UTC` : ""}`;
}

async function section<T>(name: string, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const msg =
      e instanceof GithubLimitError
        ? limitMessage(e)
        : e instanceof NotFoundError
          ? "not available for this repository"
          : "GitHub did not answer in time";
    log.warn(
      { name, err: String(e instanceof Error ? e.message : e).slice(0, 160) },
      "repository section failed",
    );
    return { ok: false, error: msg };
  }
}

interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  subscribers_count?: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
  created_at: string;
  pushed_at: string;
  archived: boolean;
  fork: boolean;
  parent?: { full_name: string; html_url: string };
  default_branch: string;
  has_issues: boolean;
  has_discussions?: boolean;
  owner: { login: string; type: string };
}

interface GhPull {
  number: number;
  html_url: string;
  merged_at: string | null;
  base: { ref: string };
}

interface GhIssue {
  title: string;
  html_url: string;
  created_at: string;
  comments: number;
  assignee: unknown;
  pull_request?: unknown;
}

/** Files at the top of a repository that say which tools it is built with. */
const TECH_FILES: [RegExp, string][] = [
  [/^package\.json$/, "Node.js / npm"],
  [/^(pnpm-lock\.yaml|pnpm-workspace\.yaml)$/, "pnpm"],
  [/^yarn\.lock$/, "Yarn"],
  [/^tsconfig.*\.json$/, "TypeScript"],
  [/^go\.mod$/, "Go modules"],
  [/^Cargo\.toml$/, "Rust / Cargo"],
  [
    /^(pyproject\.toml|setup\.py|setup\.cfg|requirements.*\.txt|Pipfile|environment\.ya?ml)$/,
    "Python packaging",
  ],
  [/^pom\.xml$/, "Java / Maven"],
  [/^(build\.gradle|build\.gradle\.kts|settings\.gradle(\.kts)?)$/, "Gradle"],
  [/^Gemfile$/, "Ruby / Bundler"],
  [/^composer\.json$/, "PHP / Composer"],
  [/^CMakeLists\.txt$/, "CMake"],
  [/^(Makefile|makefile|GNUmakefile)$/, "Make"],
  [/^meson\.build$/, "Meson"],
  [
    /^(Dockerfile.*|Containerfile.*|docker-compose.*\.ya?ml|compose\.ya?ml|.*\.dockerfile)$/i,
    "Docker",
  ],
  [/^(Chart\.yaml|charts)$/, "Helm"],
  [/^(flake\.nix|default\.nix|shell\.nix)$/, "Nix"],
  [/^pubspec\.yaml$/, "Dart / Flutter"],
  [/^mix\.exs$/, "Elixir / Mix"],
  [/^.*\.(csproj|sln)$/, ".NET"],
  [/^Package\.swift$/, "Swift Package Manager"],
  [/^(WORKSPACE|MODULE\.bazel|BUILD\.bazel)$/, "Bazel"],
  [/^\.pre-commit-config\.yaml$/, "pre-commit"],
  [/^(\.devcontainer|\.gitpod\.yml)$/, "Ready-made dev environment"],
  [
    /^(mkdocs\.ya?ml|docusaurus\.config\.(js|ts)|conf\.py|\.readthedocs\.ya?ml|book\.toml)$/,
    "Docs site",
  ],
];

/** Folders whose names tell a newcomer where things live. */
const DIR_HINTS: [RegExp, string][] = [
  [/^(src|lib|pkg|internal|app|apps|packages|crates|cmd|core)$/i, "source code"],
  [/^(test|tests|spec|__tests__|e2e|testing)$/i, "tests"],
  [/^(docs?|documentation|website|site)$/i, "documentation"],
  [/^(examples?|samples?|demo|demos|tutorials?)$/i, "examples"],
  [/^(scripts?|tools|hack|build|ci|bin)$/i, "scripts and tooling"],
  [/^\.github$/, "GitHub workflows and templates"],
  [/^(deploy|deployments?|charts|helm|manifests|config|k8s)$/i, "deployment and configuration"],
  [/^(api|proto|schemas?)$/i, "API definitions"],
];

/** Top-level files a newcomer should read first. */
const READ_FIRST =
  /^(README|CONTRIBUTING|DEVELOPMENT|DEV-GUIDE|HACKING|GOVERNANCE|MAINTAINERS|CODEOWNERS|SECURITY|ARCHITECTURE)(\.[a-z]+)?$/i;

export type ActivityStatus = "archived" | "active" | "steady" | "slowing" | "quiet" | "inactive";

export interface RepoAnalysis {
  repository: string;
  url: string;
  fetchedAt: string;
  authenticated: boolean;
  about: {
    description: string | null;
    homepage: string | null;
    topics: string[];
    license: string | null;
    created: string;
    lastPush: string;
    archived: boolean;
    fork: { of: string; url: string } | null;
    defaultBranch: string;
    stars: number;
    forks: number;
    watchers: number | null;
    ownerType: string;
    mainLanguage: string | null;
  };
  languages: Section<{ name: string; share: number }[]>;
  activity: Section<{
    /** the branch work is merged into: the default branch, or the one most recent PRs target */
    branch: string;
    commits90d: number;
    commitsCapped: boolean;
    authors90d: number;
    weeksWithCommits: number;
    /** commits per week for the last 13 weeks, oldest first (from up to 100 recent commits) */
    weeklyCommits: number[];
    /** pull requests merged per week for the last 13 weeks, oldest first */
    weeklyMerged: number[];
    lastCommit: string | null;
    lastCommitUrl: string | null;
    mergedPulls90d: number;
    mergedCapped: boolean;
    openPulls: number;
    status: ActivityStatus;
    evidence: string;
  }>;
  issues: Section<{
    openIssues: number;
    closedIssues90d: number | null;
    goodFirstIssues: number | null;
    helpWanted: number;
    goodFirstIssuesUrl: string;
    helpWantedUrl: string;
    recentGoodFirstIssues: {
      title: string;
      url: string;
      created: string;
      comments: number;
      assigned: boolean;
    }[];
    issuesEnabled: boolean;
  }>;
  contributors: Section<{
    total: number;
    capped: boolean;
    top: { login: string; url: string; contributions: number }[];
  }>;
  releases: Section<{
    total: number;
    latest: { tag: string; name: string | null; url: string; published: string } | null;
    last12m: number;
    tags: number | null;
  }>;
  community: Section<{
    healthPercentage: number | null;
    files: { label: string; url: string | null }[];
    discussions: boolean;
  }>;
  structure: Section<{
    entries: { name: string; type: "dir" | "file"; hint?: string }[];
    readFirst: string[];
    tech: string[];
    workflows: number | null;
  }>;
}

const cache = new Map<string, { at: number; data: RepoAnalysis }>();

const daysAgo = (iso: string | null) =>
  iso ? Math.floor((Date.now() - Date.parse(iso)) / DAY) : null;

/** A plain-words activity label, always shown with the numbers behind it (no score). */
export function activityStatus(x: {
  archived: boolean;
  commits90d: number;
  weeksWithCommits: number;
  mergedPulls90d: number;
  daysSincePush: number | null;
  daysSinceCommit: number | null;
}): ActivityStatus {
  if (x.archived) return "archived";
  const quiet = Math.min(x.daysSincePush ?? 9999, x.daysSinceCommit ?? 9999);
  if (x.weeksWithCommits >= 8 || x.mergedPulls90d >= 15) return "active";
  if (x.weeksWithCommits >= 4 || x.mergedPulls90d >= 5) return "steady";
  if (x.commits90d > 0 || x.mergedPulls90d > 0 || quiet <= 90) return "slowing";
  if (quiet <= 365) return "quiet";
  return "inactive";
}

export async function analyzeGithubRepository(owner: string, repo: string): Promise<RepoAnalysis> {
  const key = `${owner}/${repo}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const slug = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const { data: r } = await gh<GhRepo>(`/repos/${slug}`);
  const full = r.full_name;
  const sinceMs = Date.now() - 90 * DAY;
  const since = new Date(sinceMs).toISOString();
  const searchCount = async (q: string) =>
    (
      await gh<{ total_count: number }>(
        `/search/issues?q=${encodeURIComponent(`repo:${full} ${q}`)}&per_page=1`,
      )
    ).data.total_count;

  // open pull requests are needed twice (activity and the open-issue count), so fetch them once
  const openPullsP = gh<GhPull[]>(`/repos/${slug}/pulls?state=open&per_page=1`)
    .then(({ data, link }) => countFrom(link, data.length, 1))
    .catch(() => null);

  const [languages, activity, contributors, releases, community, structure, issues] =
    await Promise.all([
      section("languages", async () => {
        const { data } = await gh<Record<string, number>>(`/repos/${slug}/languages`);
        const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
        return Object.entries(data)
          .map(([name, bytes]) => ({ name, share: Math.round((bytes / total) * 1000) / 10 }))
          .filter((l) => l.share >= 0.1)
          .slice(0, 10);
      }),
      section("activity", async () => {
        // where recent pull requests were merged: many projects merge into "dev", not the default branch
        const { data: closed } = await gh<GhPull[]>(
          `/repos/${slug}/pulls?state=closed&sort=updated&direction=desc&per_page=100`,
        );
        const merged = closed.filter((p) => p.merged_at && Date.parse(p.merged_at) >= sinceMs);
        const byBase = new Map<string, number>();
        for (const p of merged) byBase.set(p.base.ref, (byBase.get(p.base.ref) ?? 0) + 1);
        const top = [...byBase.entries()].sort((a, b) => b[1] - a[1])[0];
        const branch =
          top && top[0] !== r.default_branch && top[1] > (byBase.get(r.default_branch) ?? 0)
            ? top[0]
            : r.default_branch;
        const { data: commits, link } = await gh<
          {
            html_url: string;
            commit: { author: { date: string } | null; committer: { date: string } | null };
            author: { login: string } | null;
          }[]
        >(`/repos/${slug}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`);
        const commits90d = countFrom(link, commits.length, 100);
        const dateOf = (c: (typeof commits)[number]) =>
          c.commit.committer?.date ?? c.commit.author?.date ?? null;
        const weeks = new Set(
          commits
            .map(dateOf)
            .filter((d): d is string => !!d)
            .map((d) => Math.floor((Date.now() - Date.parse(d)) / (7 * DAY))),
        );
        // per-week counts for the last 13 weeks, oldest first; nothing extra is fetched
        const perWeek = (dates: (string | null)[]) => {
          const out = Array.from({ length: 13 }, () => 0);
          for (const d of dates) {
            if (!d) continue;
            const w = Math.floor((Date.now() - Date.parse(d)) / (7 * DAY));
            if (w >= 0 && w < 13) out[12 - w]!++;
          }
          return out;
        };
        const weeklyCommits = perWeek(commits.map(dateOf));
        const weeklyMerged = perWeek(merged.map((p) => p.merged_at));
        let lastCommit = commits[0] ? dateOf(commits[0]) : null;
        let lastCommitUrl = commits[0]?.html_url ?? null;
        if (!lastCommit) {
          const { data: one } = await gh<typeof commits>(
            `/repos/${slug}/commits?sha=${encodeURIComponent(branch)}&per_page=1`,
          );
          lastCommit = one[0] ? dateOf(one[0]) : null;
          lastCommitUrl = one[0]?.html_url ?? null;
        }
        const mergedCapped = closed.length === 100 && merged.length === closed.length;
        const status = activityStatus({
          archived: r.archived,
          commits90d,
          weeksWithCommits: weeks.size,
          mergedPulls90d: merged.length,
          daysSincePush: daysAgo(r.pushed_at),
          daysSinceCommit: daysAgo(lastCommit),
        });
        const parts = [
          `${commits90d}${link && commits90d >= 100 ? "+" : ""} commits on \`${branch}\` in the last 90 days`,
          `${Math.min(weeks.size, 13)} of the last 13 weeks had commits`,
          `${merged.length}${mergedCapped ? "+" : ""} pull requests merged in 90 days`,
        ];
        return {
          branch,
          commits90d,
          commitsCapped: false,
          authors90d: new Set(commits.map((c) => c.author?.login).filter(Boolean)).size,
          weeksWithCommits: Math.min(weeks.size, 13),
          weeklyCommits,
          weeklyMerged,
          lastCommit,
          lastCommitUrl,
          mergedPulls90d: merged.length,
          mergedCapped,
          openPulls: (await openPullsP) ?? 0,
          status,
          evidence: parts.join("; "),
        };
      }),
      section("contributors", async () => {
        const { data, link } = await gh<
          { login: string; html_url: string; contributions: number; type: string }[]
        >(`/repos/${slug}/contributors?per_page=100`);
        const people = data.filter((c) => c.type !== "Bot" && !/\[bot\]$/i.test(c.login));
        const total = countFrom(link, data.length, 100);
        return {
          total,
          capped: !!link,
          top: people
            .slice(0, 8)
            .map((c) => ({ login: c.login, url: c.html_url, contributions: c.contributions })),
        };
      }),
      section("releases", async () => {
        const { data, link } = await gh<
          {
            tag_name: string;
            name: string | null;
            html_url: string;
            published_at: string | null;
            draft: boolean;
            prerelease: boolean;
          }[]
        >(`/repos/${slug}/releases?per_page=30`);
        const published = data.filter((x) => !x.draft && x.published_at);
        const latest = published.find((x) => !x.prerelease) ?? published[0] ?? null;
        // projects that only tag versions have no GitHub releases
        const tags = data.length
          ? null
          : await gh<unknown[]>(`/repos/${slug}/tags?per_page=1`)
              .then(({ data: t, link: l }) => countFrom(l, t.length, 1))
              .catch(() => null);
        return {
          total: countFrom(link, data.length, 30),
          latest: latest
            ? {
                tag: latest.tag_name,
                name: latest.name,
                url: latest.html_url,
                published: latest.published_at!,
              }
            : null,
          last12m: published.filter((x) => (daysAgo(x.published_at) ?? 9999) <= 365).length,
          tags,
        };
      }),
      section("community", async () => {
        const { data } = await gh<{
          health_percentage?: number;
          files: Record<string, { html_url?: string | null } | null>;
        }>(`/repos/${slug}/community/profile`);
        const f = data.files ?? {};
        const pick = (k: string, label: string) => ({
          label,
          url: f[k] ? (f[k]!.html_url ?? r.html_url) : null,
        });
        return {
          healthPercentage: data.health_percentage ?? null,
          files: [
            pick("readme", "README"),
            pick("contributing", "Contributing guide"),
            pick("code_of_conduct", "Code of conduct"),
            pick("license", "Licence"),
            pick("issue_template", "Issue template"),
            pick("pull_request_template", "Pull request template"),
          ],
          discussions: !!r.has_discussions,
        };
      }),
      section("structure", async () => {
        const { data } = await gh<{ tree: { path: string; type: "tree" | "blob" | "commit" }[] }>(
          `/repos/${slug}/git/trees/${encodeURIComponent(r.default_branch)}`,
        );
        const entries = data.tree.map((e) => ({
          name: e.path,
          type: (e.type === "blob" ? "file" : "dir") as "dir" | "file",
          hint: e.type !== "blob" ? DIR_HINTS.find(([re]) => re.test(e.path))?.[1] : undefined,
        }));
        const tech = [
          ...new Set(
            entries.flatMap((e) =>
              TECH_FILES.filter(([re]) => re.test(e.name)).map(([, label]) => label),
            ),
          ),
        ];
        let workflows: number | null = null;
        if (entries.some((e) => e.name === ".github" && e.type === "dir"))
          workflows = await gh<{ name: string }[]>(`/repos/${slug}/contents/.github/workflows`)
            .then(({ data: w }) => w.filter((x) => /\.ya?ml$/.test(x.name)).length)
            .catch(() => 0);
        entries.sort((a, b) =>
          a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1,
        );
        return {
          entries: entries.slice(0, 80),
          readFirst: entries
            .filter((e) => e.type === "file" && READ_FIRST.test(e.name))
            .map((e) => e.name),
          tech,
          workflows,
        };
      }),
      section("issues", async () => {
        const label = (l: string) =>
          gh<GhIssue[]>(
            `/repos/${slug}/issues?state=open&labels=${encodeURIComponent(l)}&per_page=30&sort=created&direction=desc`,
          ).then(({ data, link }) => ({
            items: data.filter((i) => !i.pull_request),
            count: link
              ? countFrom(link, data.length, 30)
              : data.filter((i) => !i.pull_request).length,
          }));
        const [gfi, gfiDash, help, closed90, openPulls] = await Promise.all([
          label("good first issue"),
          label("good-first-issue").catch(() => ({ items: [], count: 0 })),
          label("help wanted").catch(() => ({ items: [], count: 0 })),
          searchCount(`is:issue is:closed closed:>=${since.slice(0, 10)}`).catch(() => null),
          openPullsP,
        ]);
        const firstIssues = [...gfi.items, ...gfiDash.items]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 6);
        return {
          // GitHub's open_issues_count includes open pull requests
          openIssues: Math.max(0, r.open_issues_count - (openPulls ?? 0)),
          closedIssues90d: closed90,
          goodFirstIssues: gfi.count + gfiDash.count,
          helpWanted: help.count,
          goodFirstIssuesUrl: `${r.html_url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
          helpWantedUrl: `${r.html_url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22`,
          recentGoodFirstIssues: firstIssues.map((i) => ({
            title: i.title,
            url: i.html_url,
            created: i.created_at,
            comments: i.comments,
            assigned: !!i.assignee,
          })),
          issuesEnabled: r.has_issues,
        };
      }),
    ]);

  const analysis: RepoAnalysis = {
    repository: full,
    url: r.html_url,
    fetchedAt: new Date().toISOString(),
    authenticated: !!process.env.GITHUB_TOKEN?.trim(),
    about: {
      description: r.description,
      homepage: r.homepage || null,
      topics: r.topics?.slice(0, 15) ?? [],
      license:
        r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION"
          ? r.license.spdx_id
          : (r.license?.name ?? null),
      created: r.created_at,
      lastPush: r.pushed_at,
      archived: r.archived,
      fork: r.fork && r.parent ? { of: r.parent.full_name, url: r.parent.html_url } : null,
      defaultBranch: r.default_branch,
      stars: r.stargazers_count,
      forks: r.forks_count,
      watchers: r.subscribers_count ?? null,
      ownerType: r.owner.type,
      mainLanguage: r.language,
    },
    languages,
    activity,
    issues,
    contributors,
    releases,
    community,
    structure,
  };
  // a failed section is retried on the next request instead of being cached for 30 minutes
  const complete = [
    languages,
    activity,
    issues,
    contributors,
    releases,
    community,
    structure,
  ].every((s) => s.ok);
  if (complete) {
    if (cache.size > 200) cache.clear();
    cache.set(key, { at: Date.now(), data: analysis });
  }
  return analysis;
}

export function isNotFound(e: unknown) {
  return e instanceof NotFoundError;
}

export interface RepoDirEntry {
  name: string;
  path: string;
  type: "dir" | "file";
}

const dirCache = new Map<string, { at: number; data: RepoDirEntry[] }>();

/**
 * One folder of a repository, read when the visitor opens it in the structure tree, so the
 * analysis itself spends no requests on folders nobody opens. Cached like the analysis.
 */
export async function listRepoDirectory(
  owner: string,
  repo: string,
  ref: string,
  dir: string,
): Promise<RepoDirEntry[]> {
  const key = `${owner}/${repo}@${ref}:${dir}`.toLowerCase();
  const hit = dirCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const slug = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const path = dir.split("/").map(encodeURIComponent).join("/");
  const { data } = await gh<{ name: string; path: string; type: string }[]>(
    `/repos/${slug}/contents/${path}?ref=${encodeURIComponent(ref)}`,
  );
  const list = (Array.isArray(data) ? data : [])
    .filter((e) => e.type === "dir" || e.type === "file")
    .map((e) => ({ name: e.name, path: e.path, type: e.type as "dir" | "file" }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1))
    .slice(0, 200);
  if (dirCache.size > 500) dirCache.clear();
  dirCache.set(key, { at: Date.now(), data: list });
  return list;
}

/**
 * The repository's README as plain text (badges, images, HTML and code blocks dropped), first
 * part only: enough to say what the project is. Null when there is none.
 */
export async function readmeText(owner: string, repo: string, max = 9000): Promise<string | null> {
  const slug = `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  try {
    const { data } = await gh<{ content?: string; encoding?: string }>(`/repos/${slug}/readme`);
    if (!data.content || data.encoding !== "base64") return null;
    const text = Buffer.from(data.content, "base64")
      .toString("utf8")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(EMAIL, "[email removed]")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return text ? text.slice(0, max) : null;
  } catch {
    return null;
  }
}
