import { generateText } from "ai";
import { createLogger } from "@opensourcex/shared";
import { configuredProviders, markFailed } from "@/lib/assistant/ai";
import type { RepoAnalysis } from "@/lib/repo-analysis";

/**
 * "What is this project and what do I need to work on it?" An explanation of one repository,
 * written by the AI from the repository's own README and GitHub facts, or, when the AI is not
 * available, put together from those facts alone. Either way nothing is invented: the AI is told
 * to use only what it is given, and the fallback only restates GitHub's data.
 */
const log = createLogger("repo-explain");

export interface RepoExplanation {
  by: "ai" | "data";
  /** two or three plain sentences */
  what: string;
  why: string[];
  runsOn: string[];
  stack: { name: string; role: string }[];
  skills: { name: string; why: string }[];
  startWith: string[];
}

/** What a detected build or packaging file says about where the project runs. */
const RUNS: [RegExp, string][] = [
  [/^Docker$/, "Containers (Docker)"],
  [/^Helm$/, "Kubernetes (Helm charts)"],
  [/^Node\.js/, "Node.js runtime"],
  [/^Go modules$/, "Compiled Go binaries (Linux, macOS, Windows)"],
  [/^Rust/, "Compiled Rust binaries"],
  [/^Python packaging$/, "Python environments"],
  [/^Java \/ Maven$|^Gradle$/, "The Java Virtual Machine"],
  [/^Dart \/ Flutter$/, "Mobile and desktop through Flutter"],
  [/^\.NET$/, ".NET runtime"],
  [/^Swift Package Manager$/, "Apple platforms"],
  [/^Docs site$/, "A documentation website"],
];
const LANG_ROLE: Record<string, string> = {
  Go: "main language of the code base",
  TypeScript: "typed JavaScript for the app's code",
  JavaScript: "the app's scripting and front end",
  Python: "scripts, tooling or the main code",
  Rust: "systems code with memory safety",
  Java: "main language of the code base",
  "C++": "performance-critical code",
  C: "low-level code",
  Shell: "build and automation scripts",
  Makefile: "build tasks",
  Dockerfile: "container images",
  HTML: "web pages",
  CSS: "styling",
  SCSS: "styling",
  Smarty: "templates",
  Starlark: "Bazel build rules",
};

/** The explanation built only from GitHub's data, used when the AI is not available. */
export function explainFromData(a: RepoAnalysis): RepoExplanation {
  const langs = a.languages.ok ? a.languages.data : [];
  const tech = a.structure.ok ? a.structure.data.tech : [];
  const files = a.community.ok ? a.community.data.files : [];
  const topics = a.about.topics;
  const what =
    [
      a.about.description ? `${a.repository}: ${a.about.description.replace(/\.?$/, ".")}` : null,
      topics.length ? `GitHub topics: ${topics.slice(0, 6).join(", ")}.` : null,
    ]
      .filter(Boolean)
      .join(" ") ||
    `${a.repository} has no description on GitHub; its README is the place to start.`;
  const why: string[] = [];
  if (a.about.stars >= 1000)
    why.push(`Widely used: ${a.about.stars.toLocaleString("en-US")} stars on GitHub.`);
  if (a.activity.ok && ["active", "steady"].includes(a.activity.data.status))
    why.push("Actively maintained: regular commits and merged pull requests in the last 90 days.");
  if (a.releases.ok && a.releases.data.last12m)
    why.push(`${a.releases.data.last12m} releases in the last 12 months.`);
  if (a.about.license) why.push(`Open source under ${a.about.license}.`);
  const runsOn = [
    ...new Set(tech.flatMap((t) => RUNS.filter(([re]) => re.test(t)).map(([, r]) => r))),
  ];
  const stack = [
    ...langs
      .slice(0, 5)
      .map((l) => ({
        name: l.name,
        role: `${l.share}% of the code${LANG_ROLE[l.name] ? `: ${LANG_ROLE[l.name]}` : ""}`,
      })),
    ...tech
      .filter((t) => !langs.some((l) => t.toLowerCase().startsWith(l.name.toLowerCase())))
      .slice(0, 6)
      .map((t) => ({ name: t, role: "found in the repository's files" })),
  ];
  const skills = [
    ...langs
      .slice(0, 2)
      .map((l) => ({ name: l.name, why: `${l.share}% of the code is ${l.name}.` })),
    ...(tech.includes("Docker")
      ? [{ name: "Docker", why: "The project builds container images." }]
      : []),
    ...(tech.includes("Helm")
      ? [{ name: "Kubernetes", why: "It ships Helm charts for Kubernetes." }]
      : []),
    { name: "Git and GitHub pull requests", why: "Every change is proposed as a pull request." },
    ...(files.some((f) => f.label === "Contributing guide" && f.url)
      ? [{ name: "The contributing guide", why: "It sets the project's rules for changes." }]
      : []),
  ];
  const startWith = a.structure.ok ? a.structure.data.readFirst.slice(0, 4) : [];
  return { by: "data", what, why, runsOn, stack, skills, startWith };
}

function section(text: string, name: string): string {
  const m = text.match(
    new RegExp(`^#{2,4}\\s*${name}\\b[^\\n]*\\n([\\s\\S]*?)(?=^#{2,4}\\s|$(?![\\s\\S]))`, "im"),
  );
  return m?.[1]?.trim() ?? "";
}
const bullets = (s: string) =>
  s
    .split("\n")
    .map((l) =>
      l
        .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
        .replace(/\*\*/g, "")
        .trim(),
    )
    .filter((l) => l.length > 1);
const pairs = (s: string) =>
  bullets(s).map((l) => {
    const m = l.match(/^([^:—–-]{1,60}?)\s*[:—–-]\s+(.+)$/);
    return m ? { a: m[1]!.trim(), b: m[2]!.trim() } : { a: l, b: "" };
  });

/** The AI's explanation from the README and GitHub facts; throws when no provider answers. */
export async function explainWithAi(
  a: RepoAnalysis,
  readme: string | null,
): Promise<RepoExplanation> {
  const langs = a.languages.ok
    ? a.languages.data.map((l) => `${l.name} ${l.share}%`).join(", ")
    : "unknown";
  const tech = a.structure.ok ? a.structure.data.tech.join(", ") : "";
  const entries = a.structure.ok
    ? a.structure.data.entries.map((e) => (e.type === "dir" ? `${e.name}/` : e.name)).join(", ")
    : "";
  const prompt = `Repository: ${a.repository}
Description: ${a.about.description ?? "none"}
Topics: ${a.about.topics.join(", ") || "none"}
Languages by code size: ${langs}
Build and tooling files found: ${tech || "none"}
Top-level files and folders: ${entries || "unknown"}
Stars: ${a.about.stars}. Licence: ${a.about.license ?? "none"}.

README (excerpt):
"""
${readme ?? "No README."}
"""

Write these sections, each starting with its heading line exactly as shown:
### WHAT
Two or three plain sentences: what this project is and what problem it solves.
### WHY
Three to five bullets: why people use it, its main strengths or use cases.
### RUNS
Bullets: where and on what it runs (platforms, runtimes, environments, clouds, devices).
### STACK
Bullets as "Name: its role in this project" for the main languages, frameworks, libraries and tools.
### SKILLS
Bullets as "Skill: why it matters here", most important first, for someone who wants to contribute.
### START
Two to four bullets: where a newcomer should start reading or contributing; name only files or folders from the top-level list above.`;

  let lastError: unknown = null;
  for (const p of configuredProviders()) {
    try {
      const { text } = await generateText({
        model: p.model,
        instructions:
          "You explain open source repositories to students who want to contribute. Use only the facts given (the README and GitHub data) plus widely known facts about the named technologies. Never invent features, numbers, people, files or history. Plain words, no marketing, no markdown inside bullets.",
        prompt,
        maxOutputTokens: 3000,
        maxRetries: 1,
        timeout: { totalMs: 45_000 },
      });
      const what = section(text, "WHAT").replace(/\s+/g, " ");
      if (!what) throw new Error("no WHAT section in the reply");
      return {
        by: "ai",
        what,
        why: bullets(section(text, "WHY")).slice(0, 6),
        runsOn: bullets(section(text, "RUNS")).slice(0, 6),
        stack: pairs(section(text, "STACK"))
          .slice(0, 10)
          .map((x) => ({ name: x.a, role: x.b })),
        skills: pairs(section(text, "SKILLS"))
          .slice(0, 8)
          .map((x) => ({ name: x.a, why: x.b })),
        startWith: bullets(section(text, "START")).slice(0, 4),
      };
    } catch (e) {
      lastError = e;
      const err = String((e as Error)?.message ?? e);
      if (!/no WHAT section/i.test(err)) markFailed(p.engine);
      log.warn({ engine: p.engine, err: err.slice(0, 300) }, "explain provider failed");
    }
  }
  throw lastError ?? new Error("no AI provider configured");
}
