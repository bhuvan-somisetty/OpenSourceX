import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activityStatus,
  analyzeGithubRepository,
  GithubLimitError,
  isNotFound,
} from "./repo-analysis";

const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString();

const REPO = {
  full_name: "acme/widget",
  html_url: "https://github.com/acme/widget",
  description: "A widget",
  homepage: "",
  stargazers_count: 17,
  forks_count: 40,
  subscribers_count: 3,
  open_issues_count: 24,
  language: "C++",
  topics: ["robots"],
  license: { spdx_id: "LGPL-2.1", name: "LGPL" },
  created_at: "2022-01-05T00:00:00Z",
  pushed_at: iso(2),
  archived: false,
  fork: false,
  default_branch: "main",
  has_issues: true,
  has_discussions: false,
  owner: { login: "acme", type: "Organization" },
};

type Route = [RegExp, () => Response];
const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers });

function mockGithub(routes: Route[]) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const hit = routes.find(([re]) => re.test(url));
      return hit ? hit[1]() : new Response("{}", { status: 404 });
    }),
  );
  return calls;
}

// 21 PRs merged into dev, 2 into main, in the last 90 days
const merged = [
  ...Array.from({ length: 21 }, (_, i) => ({
    number: i,
    html_url: "",
    merged_at: iso(5 + i),
    base: { ref: "dev" },
  })),
  { number: 99, html_url: "", merged_at: iso(10), base: { ref: "main" } },
  { number: 98, html_url: "", merged_at: iso(11), base: { ref: "main" } },
];
const commits = Array.from({ length: 53 }, (_, i) => ({
  html_url: `https://github.com/acme/widget/commit/${i}`,
  commit: { author: { date: iso(i) }, committer: { date: iso(i) } },
  author: { login: `dev${i % 4}` },
}));

const base: Route[] = [
  [/\/repos\/acme\/widget$/, () => json(REPO)],
  [/\/languages$/, () => json({ "C++": 750, Python: 250 })],
  [/\/pulls\?state=open/, () => json([{}], { link: '<https://x/?page=12>; rel="last"' })],
  [/\/pulls\?state=closed/, () => json(merged)],
  [/\/commits\?sha=dev&since=/, () => json(commits)],
  [
    /\/contributors/,
    () =>
      json([
        { login: "pradeeban", html_url: "u", contributions: 389, type: "User" },
        { login: "dependabot[bot]", html_url: "b", contributions: 9, type: "Bot" },
      ]),
  ],
  [
    /\/releases/,
    () =>
      json([
        {
          tag_name: "2.4.0",
          name: "v2.4.0",
          html_url: "r",
          published_at: iso(200),
          draft: false,
          prerelease: false,
        },
      ]),
  ],
  [
    /\/community\/profile/,
    () =>
      json({
        health_percentage: 62,
        files: {
          readme: { html_url: "readme" },
          contributing: { html_url: "contrib" },
          code_of_conduct: null,
          license: { html_url: "lic" },
        },
      }),
  ],
  [
    /\/git\/trees\//,
    () =>
      json({
        tree: [
          { path: "src", type: "tree" },
          { path: ".github", type: "tree" },
          { path: "CONTRIBUTING.md", type: "blob" },
          { path: "Dockerfile.py", type: "blob" },
          { path: "pyproject.toml", type: "blob" },
        ],
      }),
  ],
  [
    /\/contents\/\.github\/workflows/,
    () => json([{ name: "ci.yml" }, { name: "lint.yaml" }, { name: "README.md" }]),
  ],
  [
    /labels=good%20first%20issue/,
    () =>
      json([
        { title: "Fix typo", html_url: "i1", created_at: iso(3), comments: 1, assignee: null },
        {
          title: "a PR",
          html_url: "p",
          created_at: iso(1),
          comments: 0,
          assignee: null,
          pull_request: {},
        },
      ]),
  ],
  [/labels=good-first-issue/, () => json([])],
  [/labels=help%20wanted/, () => json([])],
  [/\/search\/issues/, () => json({ total_count: 16, items: [] })],
];

afterEach(() => vi.unstubAllGlobals());

describe("activity label", () => {
  const quiet = {
    archived: false,
    commits90d: 0,
    weeksWithCommits: 0,
    mergedPulls90d: 0,
    daysSincePush: 400,
    daysSinceCommit: 400,
  };
  it("never calls an archived repository active", () => {
    expect(activityStatus({ ...quiet, archived: true, weeksWithCommits: 13 })).toBe("archived");
  });
  it("labels from commits and merged pull requests together", () => {
    expect(activityStatus({ ...quiet, weeksWithCommits: 10 })).toBe("active");
    expect(activityStatus({ ...quiet, mergedPulls90d: 21 })).toBe("active");
    expect(activityStatus({ ...quiet, mergedPulls90d: 6 })).toBe("steady");
    expect(activityStatus({ ...quiet, commits90d: 1, weeksWithCommits: 1 })).toBe("slowing");
    expect(activityStatus({ ...quiet, daysSincePush: 200, daysSinceCommit: 200 })).toBe("quiet");
    expect(activityStatus(quiet)).toBe("inactive");
  });
});

describe("analyzeGithubRepository", () => {
  it("reads every section and counts on the branch pull requests are merged into", async () => {
    mockGithub(base);
    const a = await analyzeGithubRepository("acme", "widget");
    expect(a.repository).toBe("acme/widget");
    expect(a.about.license).toBe("LGPL-2.1");
    expect(a.languages).toEqual({
      ok: true,
      data: [
        { name: "C++", share: 75 },
        { name: "Python", share: 25 },
      ],
    });
    if (!a.activity.ok) throw new Error("activity failed");
    expect(a.activity.data.branch).toBe("dev");
    expect(a.activity.data.commits90d).toBe(53);
    expect(a.activity.data.mergedPulls90d).toBe(23);
    expect(a.activity.data.openPulls).toBe(12);
    expect(a.activity.data.status).toBe("active");
    if (!a.issues.ok) throw new Error("issues failed");
    // open_issues_count (24) includes the 12 open pull requests
    expect(a.issues.data.openIssues).toBe(12);
    expect(a.issues.data.closedIssues90d).toBe(16);
    expect(a.issues.data.goodFirstIssues).toBe(1);
    expect(a.issues.data.recentGoodFirstIssues.map((i) => i.title)).toEqual(["Fix typo"]);
    if (!a.contributors.ok || !a.structure.ok || !a.community.ok) throw new Error("section failed");
    expect(a.contributors.data.top.map((c) => c.login)).toEqual(["pradeeban"]);
    expect(a.structure.data.tech).toEqual(expect.arrayContaining(["Docker", "Python packaging"]));
    expect(a.structure.data.workflows).toBe(2);
    expect(a.structure.data.readFirst).toEqual(["CONTRIBUTING.md"]);
    expect(a.community.data.files.find((f) => f.label === "Code of conduct")?.url).toBeNull();
  });

  it("keeps the other sections when one hits GitHub's limit", async () => {
    mockGithub([
      [
        /\/languages$/,
        () =>
          new Response("{}", {
            status: 403,
            headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1792544160" },
          }),
      ],
      ...base.map(([re, fn]) => [new RegExp(re.source.replace("widget", "gadget")), fn] as Route),
    ]);
    const a = await analyzeGithubRepository("acme", "gadget");
    expect(a.languages.ok).toBe(false);
    if (!a.languages.ok)
      expect(a.languages.error).toMatch(/request limit .* resets at \d\d:\d\d UTC/);
    expect(a.activity.ok).toBe(true);
  });

  it("reports a missing repository and the hourly limit as their own errors", async () => {
    mockGithub([]);
    await expect(analyzeGithubRepository("acme", "nope")).rejects.toSatisfy(isNotFound);
    mockGithub([
      [/./, () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } })],
    ]);
    await expect(analyzeGithubRepository("acme", "limited")).rejects.toBeInstanceOf(
      GithubLimitError,
    );
  });
});
