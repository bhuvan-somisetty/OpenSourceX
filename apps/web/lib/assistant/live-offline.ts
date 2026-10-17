import { normalize, orgsMentioned, type Knowledge } from "./knowledge";
import {
  githubGoodFirstIssues,
  githubOrgTopRepos,
  githubRepo,
  liveApisEnabled,
  packageInfo,
  repoSlug,
  vulnerabilities,
  type Ecosystem,
} from "./live";

/**
 * Live answers the offline engine can give without an AI model: good first issues, repository
 * stats and package versions/vulnerabilities. Returns null when the question is not one of these
 * or the lookup fails, so the normal offline answer is used instead.
 */
const ECO_WORDS: [RegExp, Ecosystem][] = [
  [/\b(npm|node|javascript|js) (package|library|module)\b|\bnpm\b/, "npm"],
  [/\b(pypi|pip|python (package|library))\b/, "pypi"],
  [/\b(crate|crates|cargo|rust (crate|library))\b/, "crates"],
  [/\b(gem|rubygems|ruby (gem|library))\b/, "rubygems"],
  [/\b(composer|packagist|php (package|library))\b/, "packagist"],
  [/\b(nuget|\.net|dotnet|c# (package|library))\b/, "nuget"],
  [/\b(go module|golang module|go package)\b/, "go"],
];
const LANGS = [
  "go",
  "golang",
  "python",
  "rust",
  "javascript",
  "typescript",
  "java",
  "c++",
  "ruby",
  "php",
  "kotlin",
  "swift",
  "c#",
];

const mdLink = (label: string, url: string) => `[${label.replace(/[[\]]/g, "")}](${url})`;
const num = (n: number | null | undefined) => (n == null ? "unknown" : n.toLocaleString("en-US"));

function githubRepoOf(k: Knowledge, raw: string): { name: string; slug: string } | null {
  const direct = raw.match(/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/)?.[0];
  if (direct) return { name: repoSlug(direct)!, slug: repoSlug(direct)! };
  for (const o of orgsMentioned(k, raw)) {
    const url = [o.repoUrl, o.githubUrl].find((u) => u && /github\.com\/[^/]+\/[^/#?]+/.test(u));
    if (url) return { name: o.name, slug: repoSlug(url)! };
  }
  return null;
}

function githubOrgOf(k: Knowledge, raw: string): { name: string; login: string } | null {
  for (const o of orgsMentioned(k, raw)) {
    const m = [o.githubUrl, o.repoUrl]
      .map((u) => u?.match(/github\.com\/(?:orgs\/)?([A-Za-z0-9_.-]+)\/?$/)?.[1])
      .find(Boolean);
    if (m) return { name: o.name, login: m };
  }
  return null;
}

export async function liveOfflineAnswer(question: string, k: Knowledge): Promise<string | null> {
  if (!liveApisEnabled()) return null;
  const raw = question.trim();
  const q = normalize(raw);
  try {
    if (
      /good first issues?|beginner (friendly )?issues?|easy issues?|first issues?|help wanted/.test(
        q,
      )
    ) {
      const repo = githubRepoOf(k, raw);
      const org = repo ? null : githubOrgOf(k, raw);
      const language = LANGS.find((l) => ` ${q} `.includes(` ${l} `));
      if (!repo && !org && !language) return null;
      const r = await githubGoodFirstIssues({
        repo: repo?.slug ?? org?.login,
        language: language === "golang" ? "go" : language,
        label: /help wanted/.test(q) ? "help wanted" : undefined,
        limit: 10,
      });
      const scope = repo?.name ?? org?.name ?? `popular ${language} projects`;
      if (!r.issues.length)
        return `No open good first issues found for **${scope}** right now. [Search GitHub yourself](${r.searchUrl}).\n\n_Live from the GitHub search API._`;
      return [
        `### Open good first issues: ${scope}`,
        r.includesAssigned
          ? `No unassigned ones right now; ${num(r.total)} open good first issues exist, but someone may already be working on them, so ask before starting:`
          : `${num(r.total)} open, unassigned issues match. Newest first:`,
        r.issues
          .map(
            (i) =>
              `- ${mdLink(i.title, i.url)} · \`${i.repository}\` · opened ${i.opened} · ${i.comments} comments${i.assigned ? " · assigned" : ""}`,
          )
          .join("\n"),
        `[See all on GitHub](${r.searchUrl}). Comment on an issue before you start, and read the project's CONTRIBUTING guide.`,
        "_Live from the GitHub search API._",
      ].join("\n\n");
    }

    if (
      /\b(stars?|forks?|how popular|popularity|stats|statistics|last commit|activity|active|watchers)\b/.test(
        q,
      )
    ) {
      const repo = githubRepoOf(k, raw);
      if (!repo) {
        const org = githubOrgOf(k, raw);
        if (!org) return null;
        const top = await githubOrgTopRepos(org.login);
        if (!top.repositories.length) return null;
        return [
          `### ${org.name}: most-starred repositories`,
          `| Repository | Stars | Language | Licence | Last push |\n| --- | --- | --- | --- | --- |\n${top.repositories
            .map(
              (x) =>
                `| ${mdLink(x.repository, x.url)} | ${num(x.stars)} | ${x.language ?? ""} | ${x.license ?? ""} | ${x.lastPush} |`,
            )
            .join("\n")}`,
          `${num(top.total)} public repositories in total: ${mdLink(`github.com/${org.login}`, `https://github.com/${org.login}`)}`,
          "_Live from the GitHub search API._",
        ].join("\n\n");
      }
      const r = await githubRepo(repo.slug);
      return [
        `### ${r.repository}${r.archived ? " (archived)" : ""}`,
        r.description ?? "",
        `| | |\n| --- | --- |\n| Stars | ${num(r.stars)} |\n| Forks | ${num(r.forks)} |\n| Watchers | ${num(r.watchers)} |\n| Open issues and PRs | ${num(r.openIssuesAndPRs)} |\n| Open good first issues | ${r.openGoodFirstIssues == null ? "unknown" : mdLink(String(r.openGoodFirstIssues), r.goodFirstIssuesUrl)} |\n| Language | ${r.language ?? "unknown"} |\n| Licence | ${r.license ?? "none listed"} |\n| Last push | ${r.lastPush.slice(0, 10)} |`,
        `${mdLink("Open on GitHub", r.url)}${r.homepage ? ` · ${mdLink("Website", r.homepage)}` : ""}`,
        "_Live from the GitHub REST API._",
      ]
        .filter(Boolean)
        .join("\n\n");
    }

    const eco = ECO_WORDS.find(([re]) => re.test(q))?.[1];
    const wantsVuln = /vulnerab|cve|security (issue|advisor)|ghsa/.test(q);
    if (
      eco &&
      (wantsVuln || /\b(latest|current|newest) version|version of|what version\b/.test(q))
    ) {
      const name =
        raw.match(/[`"']([^`"']+)[`"']/)?.[1] ??
        raw.match(/\b(?:of|for|package|library|crate|gem|module)\s+(@?[A-Za-z0-9_.\-/]+)/i)?.[1];
      if (!name || /^(the|a|an|my|this)$/i.test(name)) return null;
      const version = raw.match(/\b(?:version|v|@)\s?(\d+\.\d+(?:\.\d+)?)\b/)?.[1];
      if (wantsVuln) {
        const v = await vulnerabilities(eco, name, version);
        return [
          `### Known vulnerabilities: ${v.package}`,
          v.count
            ? v.vulnerabilities
                .map(
                  (x) =>
                    `- ${mdLink(x.id, x.url)}${x.severity ? ` (${x.severity})` : ""}: ${x.summary ?? "no summary"}`,
                )
                .join("\n")
            : "No known vulnerabilities in OSV.dev.",
          v.note ? `_${v.note}_` : "",
          "_Live from the OSV.dev API._",
        ]
          .filter(Boolean)
          .join("\n\n");
      }
      const p = await packageInfo(eco, name);
      const rows = Object.entries({
        "Latest version": p.latestVersion,
        Licence: "license" in p ? p.license : null,
        Repository: "repository" in p && p.repository ? p.repository : null,
      }).filter(([, v]) => v);
      return [
        `### ${p.name} (${eco})`,
        "description" in p && p.description ? String(p.description) : "",
        `| | |\n| --- | --- |\n${rows.map(([kk, v]) => `| ${kk} | ${v} |`).join("\n")}`,
        mdLink("Package page", p.page),
        `_Live from the ${p.source.replace(" (live)", "")}._`,
      ]
        .filter(Boolean)
        .join("\n\n");
    }
  } catch {
    return null;
  }
  return null;
}
