import { createLogger } from "@opensourcex/shared";

/**
 * Live, read-only lookups against free public APIs (picked from github.com/public-apis/public-apis,
 * all usable without a key): GitHub REST, package registries (npm, PyPI, crates.io, RubyGems,
 * Packagist, NuGet, Go module proxy), OSV vulnerabilities, Hacker News (Algolia search),
 * Stack Exchange and Wikipedia. Used at answer time only, never stored. Responses are cached for
 * ten minutes, time out after eight seconds, and are stripped of email addresses.
 */
const log = createLogger("ask-live");
const TTL_MS = 10 * 60_000;
const TIMEOUT_MS = 8_000;
const cache = new Map<string, { at: number; data: unknown }>();
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

export function liveApisEnabled(): boolean {
  return process.env.ASK_LIVE_APIS?.trim() !== "false";
}

/** Removes email addresses (package authors, commit metadata) from anything an API returns. */
export function scrubEmails<T>(value: T): T {
  return JSON.parse(JSON.stringify(value).replace(EMAIL, "[email removed]")) as T;
}

async function getJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const key = `${init.method ?? "GET"} ${url} ${init.body ?? ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  const headers: Record<string, string> = {
    "user-agent": "OpenSourceX (open source knowledge assistant)",
    accept: "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token && url.startsWith("https://api.github.com/")) headers.authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  const data = scrubEmails(await res.json());
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), data });
  return data as T;
}

/** Runs a lookup and turns any failure into a short, model-friendly error. */
export async function safely<T>(
  what: string,
  fn: () => Promise<T>,
): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log.warn({ what, err: msg.slice(0, 200) }, "live lookup failed");
    return {
      error: `Live ${what} lookup failed (${msg.slice(0, 120)}). Say so and point to the source site.`,
    };
  }
}

const enc = encodeURIComponent;
const GH = "https://api.github.com";

/** "kyverno/kyverno" from a repo slug or any github.com URL. */
export function repoSlug(input: string): string | null {
  const m = input
    .trim()
    .match(/(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[/#?].*)?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

interface GhRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count?: number;
  language: string | null;
  topics?: string[];
  license: { spdx_id: string | null; name: string } | null;
  pushed_at: string;
  created_at: string;
  archived: boolean;
  homepage: string | null;
  default_branch: string;
  owner?: { type?: string };
  fork?: boolean;
  parent?: { full_name: string };
}

export async function githubRepo(repo: string) {
  const slug = repoSlug(repo);
  if (!slug) throw new Error("expected owner/repo");
  const r = await getJson<GhRepo>(`${GH}/repos/${slug}`);
  const gfi = await getJson<{ total_count: number }>(
    `${GH}/search/issues?q=${enc(`repo:${slug} is:issue is:open label:"good first issue"`)}&per_page=1`,
  ).catch(() => null);
  return {
    repository: r.full_name,
    url: r.html_url,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: r.subscribers_count,
    openIssuesAndPRs: r.open_issues_count,
    openGoodFirstIssues: gfi?.total_count ?? null,
    goodFirstIssuesUrl: `${r.html_url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`,
    language: r.language,
    topics: r.topics?.slice(0, 12) ?? [],
    license: r.license?.spdx_id ?? r.license?.name ?? null,
    lastPush: r.pushed_at,
    created: r.created_at,
    archived: r.archived,
    homepage: r.homepage || null,
    /** "Organization" or "User": a person's other repositories are not an organization's */
    ownerType: r.owner?.type ?? null,
    /** the repository this one was forked from, if any */
    forkOf: r.fork ? (r.parent?.full_name ?? null) : null,
    source: "GitHub REST API (live)",
  };
}

interface GhIssue {
  title: string;
  html_url: string;
  repository_url: string;
  created_at: string;
  comments: number;
  labels: { name: string }[];
  assignee: unknown;
}

export async function githubGoodFirstIssues(opts: {
  repo?: string;
  language?: string;
  label?: string;
  limit?: number;
}) {
  const label = opts.label?.trim() || "good first issue";
  const limit = Math.min(opts.limit ?? 10, 20);
  const slug = opts.repo ? repoSlug(opts.repo) : null;
  const scope: string[] = [];
  let popular: string[] = [];
  if (slug) scope.push(`repo:${slug}`);
  else if (opts.repo) scope.push(`org:${opts.repo.trim()}`);
  else if (opts.language) {
    // language only: take issues from well-known repos that keep good first issues open,
    // not from the newest throwaway repos
    const repos = await getJson<{ items: GhRepo[] }>(
      `${GH}/search/repositories?q=${enc(`good-first-issues:>3 stars:>500 language:${opts.language.trim()}`)}&sort=stars&order=desc&per_page=8`,
    );
    popular = repos.items.map((r) => r.full_name);
    scope.push(...popular.map((r) => `repo:${r}`));
  }
  const search = async (unassignedOnly: boolean) => {
    const q = [
      "is:issue",
      "is:open",
      ...(unassignedOnly ? ["no:assignee"] : []),
      `label:"${label}"`,
      ...scope,
    ].join(" ");
    const r = await getJson<{ total_count: number; items: GhIssue[] }>(
      `${GH}/search/issues?q=${enc(q)}&sort=created&order=desc&per_page=${limit}`,
    );
    return { q, r };
  };
  let { q, r } = await search(true);
  let includesAssigned = false;
  if (!r.total_count) {
    ({ q, r } = await search(false));
    includesAssigned = r.total_count > 0;
  }
  return {
    query: q,
    total: r.total_count,
    includesAssigned,
    fromPopularRepos: popular.length ? popular : undefined,
    issues: r.items.map((i) => ({
      title: i.title,
      url: i.html_url,
      repository: i.repository_url.replace(`${GH}/repos/`, ""),
      opened: i.created_at.slice(0, 10),
      comments: i.comments,
      assigned: !!i.assignee,
      labels: i.labels.map((l) => l.name).slice(0, 6),
    })),
    searchUrl: `https://github.com/search?type=issues&q=${enc(q)}`,
    source: "GitHub search API (live)",
  };
}

/** A GitHub organization's most-starred public repositories (for orgs recorded without one repo). */
export async function githubOrgTopRepos(login: string, limit = 5) {
  return githubSearchRepos(`org:${login.trim()}`, { limit });
}

export async function githubSearchRepos(
  query: string,
  opts: { language?: string; limit?: number } = {},
) {
  const q = [query, opts.language ? `language:${opts.language}` : ""].filter(Boolean).join(" ");
  const r = await getJson<{ total_count: number; items: GhRepo[] }>(
    `${GH}/search/repositories?q=${enc(q)}&sort=stars&order=desc&per_page=${Math.min(opts.limit ?? 10, 20)}`,
  );
  return {
    query: q,
    total: r.total_count,
    repositories: r.items.map((x) => ({
      repository: x.full_name,
      url: x.html_url,
      description: x.description,
      stars: x.stargazers_count,
      language: x.language,
      license: x.license?.spdx_id ?? null,
      lastPush: x.pushed_at.slice(0, 10),
    })),
    source: "GitHub search API (live)",
  };
}

export type Ecosystem = "npm" | "pypi" | "crates" | "rubygems" | "packagist" | "nuget" | "go";
export const ECOSYSTEMS: readonly Ecosystem[] = [
  "npm",
  "pypi",
  "crates",
  "rubygems",
  "packagist",
  "nuget",
  "go",
];

export async function packageInfo(ecosystem: Ecosystem, name: string) {
  const n = name.trim();
  switch (ecosystem) {
    case "npm": {
      const r = await getJson<{
        version: string;
        description?: string;
        license?: string;
        homepage?: string;
        repository?: { url?: string } | string;
      }>(`https://registry.npmjs.org/${n.startsWith("@") ? n.replace("/", "%2F") : enc(n)}/latest`);
      const repo = typeof r.repository === "string" ? r.repository : r.repository?.url;
      return {
        ecosystem,
        name: n,
        latestVersion: r.version,
        description: r.description ?? null,
        license: r.license ?? null,
        homepage: r.homepage ?? null,
        repository: repo?.replace(/^git\+/, "").replace(/\.git$/, "") ?? null,
        page: `https://www.npmjs.com/package/${n}`,
        source: "npm registry (live)",
      };
    }
    case "pypi": {
      const r = await getJson<{
        info: {
          version: string;
          summary: string | null;
          license: string | null;
          license_expression?: string | null;
          home_page: string | null;
          project_urls: Record<string, string> | null;
          requires_python: string | null;
        };
      }>(`https://pypi.org/pypi/${enc(n)}/json`);
      const urls = Object.fromEntries(
        Object.entries(r.info.project_urls ?? {})
          .filter(([, u]) => /^https?:/.test(u))
          .slice(0, 6),
      );
      return {
        ecosystem,
        name: n,
        latestVersion: r.info.version,
        description: r.info.summary,
        license:
          r.info.license_expression ||
          (r.info.license && r.info.license.length < 60 ? r.info.license : null),
        requiresPython: r.info.requires_python,
        links: urls,
        page: `https://pypi.org/project/${n}/`,
        source: "PyPI JSON API (live)",
      };
    }
    case "crates": {
      const r = await getJson<{
        crate: {
          max_stable_version: string | null;
          newest_version: string;
          description: string | null;
          repository: string | null;
          homepage: string | null;
          downloads: number;
        };
        versions?: { license?: string }[];
      }>(`https://crates.io/api/v1/crates/${enc(n)}`);
      return {
        ecosystem,
        name: n,
        latestVersion: r.crate.max_stable_version ?? r.crate.newest_version,
        description: r.crate.description,
        license: r.versions?.[0]?.license ?? null,
        downloads: r.crate.downloads,
        repository: r.crate.repository,
        homepage: r.crate.homepage,
        page: `https://crates.io/crates/${n}`,
        source: "crates.io API (live)",
      };
    }
    case "rubygems": {
      const r = await getJson<{
        version: string;
        info: string;
        licenses: string[] | null;
        downloads: number;
        source_code_uri: string | null;
        homepage_uri: string | null;
      }>(`https://rubygems.org/api/v1/gems/${enc(n)}.json`);
      return {
        ecosystem,
        name: n,
        latestVersion: r.version,
        description: r.info,
        license: r.licenses?.join(", ") ?? null,
        downloads: r.downloads,
        repository: r.source_code_uri,
        homepage: r.homepage_uri,
        page: `https://rubygems.org/gems/${n}`,
        source: "RubyGems API (live)",
      };
    }
    case "packagist": {
      const r = await getJson<{
        packages: Record<
          string,
          {
            version: string;
            description?: string;
            license?: string[];
            source?: { url?: string };
            homepage?: string;
          }[]
        >;
      }>(`https://repo.packagist.org/p2/${n.toLowerCase()}.json`);
      const latest =
        r.packages[n.toLowerCase()]?.find((v) => !/dev|alpha|beta|rc/i.test(v.version)) ??
        r.packages[n.toLowerCase()]?.[0];
      if (!latest) throw new Error("package not found");
      return {
        ecosystem,
        name: n,
        latestVersion: latest.version,
        description: latest.description ?? null,
        license: latest.license?.join(", ") ?? null,
        repository: latest.source?.url?.replace(/\.git$/, "") ?? null,
        homepage: latest.homepage ?? null,
        page: `https://packagist.org/packages/${n}`,
        source: "Packagist API (live)",
      };
    }
    case "nuget": {
      const r = await getJson<{ versions: string[] }>(
        `https://api.nuget.org/v3-flatcontainer/${n.toLowerCase()}/index.json`,
      );
      const stable = [...r.versions].reverse().find((v) => !v.includes("-")) ?? r.versions.at(-1);
      return {
        ecosystem,
        name: n,
        latestVersion: stable ?? null,
        versionsPublished: r.versions.length,
        page: `https://www.nuget.org/packages/${n}`,
        source: "NuGet API (live)",
      };
    }
    case "go": {
      const mod = n.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);
      const r = await getJson<{ Version: string; Time: string; Origin?: { URL?: string } }>(
        `https://proxy.golang.org/${mod}/@latest`,
      );
      return {
        ecosystem,
        name: n,
        latestVersion: r.Version,
        released: r.Time?.slice(0, 10),
        repository: r.Origin?.URL ?? null,
        page: `https://pkg.go.dev/${n}`,
        source: "Go module proxy (live)",
      };
    }
  }
}

const OSV_ECOSYSTEM: Record<Ecosystem, string> = {
  npm: "npm",
  pypi: "PyPI",
  crates: "crates.io",
  rubygems: "RubyGems",
  packagist: "Packagist",
  nuget: "NuGet",
  go: "Go",
};

export async function vulnerabilities(ecosystem: Ecosystem, name: string, version?: string) {
  const body = JSON.stringify({
    package: { name: name.trim(), ecosystem: OSV_ECOSYSTEM[ecosystem] },
    ...(version ? { version } : {}),
  });
  const r = await getJson<{
    vulns?: {
      id: string;
      summary?: string;
      aliases?: string[];
      modified: string;
      database_specific?: { severity?: string };
    }[];
  }>("https://api.osv.dev/v1/query", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });
  const vulns = r.vulns ?? [];
  return {
    package: `${ecosystem}:${name}${version ? `@${version}` : ""}`,
    count: vulns.length,
    vulnerabilities: vulns.slice(0, 15).map((v) => ({
      id: v.id,
      summary: v.summary ?? null,
      aliases: v.aliases?.slice(0, 3) ?? [],
      severity: v.database_specific?.severity ?? null,
      url: `https://osv.dev/vulnerability/${v.id}`,
    })),
    note: version
      ? undefined
      : "No version given, so this lists every known vulnerability for any version.",
    source: "OSV.dev API (live)",
  };
}

export async function hackerNews(query: string, limit = 8) {
  const r = await getJson<{
    hits: {
      title: string | null;
      url: string | null;
      objectID: string;
      points: number | null;
      num_comments: number | null;
      created_at: string;
    }[];
  }>(
    `https://hn.algolia.com/api/v1/search?query=${enc(query)}&tags=story&hitsPerPage=${Math.min(limit, 15)}`,
  );
  return {
    query,
    stories: r.hits
      .filter((h) => h.title)
      .map((h) => ({
        title: h.title,
        url: h.url ?? `https://news.ycombinator.com/item?id=${h.objectID}`,
        discussion: `https://news.ycombinator.com/item?id=${h.objectID}`,
        points: h.points,
        comments: h.num_comments,
        date: h.created_at.slice(0, 10),
      })),
    source: "Hacker News search (Algolia, live)",
  };
}

const decodeHtml = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

export async function stackOverflow(query: string, limit = 6) {
  const r = await getJson<{
    items: {
      title: string;
      link: string;
      score: number;
      is_answered: boolean;
      answer_count: number;
      tags: string[];
    }[];
  }>(
    `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${enc(query)}&site=stackoverflow&pagesize=${Math.min(limit, 10)}&filter=default`,
  );
  return {
    query,
    questions: r.items.map((i) => ({
      title: decodeHtml(i.title),
      url: i.link,
      score: i.score,
      answered: i.is_answered,
      answers: i.answer_count,
      tags: i.tags.slice(0, 5),
    })),
    source: "Stack Exchange API (live)",
  };
}

export async function wikipedia(topic: string) {
  const r = await getJson<{
    title: string;
    extract: string;
    content_urls?: { desktop?: { page?: string } };
    type: string;
  }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${enc(topic.trim().replace(/ /g, "_"))}`);
  return {
    title: r.title,
    summary: r.extract,
    url: r.content_urls?.desktop?.page ?? null,
    disambiguation: r.type === "disambiguation",
    source: "Wikipedia REST API (live)",
  };
}
