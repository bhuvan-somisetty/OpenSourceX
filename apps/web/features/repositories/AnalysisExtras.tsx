"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listDirectory } from "@/app/(app)/repositories/analyze/actions";
import { ConfirmDelete } from "@/components/ui/ConfirmDelete";
import type { RepoAnalysis, RepoDirEntry } from "@/lib/repo-analysis";

/**
 * The parts of the repository analysis that turn numbers into pictures and next steps: a health
 * snapshot, weekly activity, first issues as cards, an expandable folder tree, sharing, the
 * interview link, a loading skeleton and the recently analysed list. All figures come from the
 * analysis itself; nothing is scored.
 */
const ext = { target: "_blank", rel: "noreferrer noopener" } as const;
const num = (n: number) => n.toLocaleString("en-US");
const ago = (iso: string) => {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 60) return `${d} days ago`;
  if (d < 730) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
};

/* ------------------------------ 1. health ------------------------------ */

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="ra2-spark" aria-hidden="true">
      {values.map((v, i) => (
        <i
          key={i}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
          data-zero={!v || undefined}
        />
      ))}
    </span>
  );
}

export function HealthTiles({ a }: { a: RepoAnalysis }) {
  const act = a.activity.ok ? a.activity.data : null;
  const iss = a.issues.ok ? a.issues.data : null;
  const tiles = [
    act && {
      k: "Commits",
      v: `${num(act.commits90d)}${act.commits90d >= 100 ? "+" : ""}`,
      s: "last 90 days",
      series: act.weeklyCommits,
    },
    act && {
      k: "PRs merged",
      v: `${num(act.mergedPulls90d)}${act.mergedCapped ? "+" : ""}`,
      s: "last 90 days",
      series: act.weeklyMerged,
    },
    iss &&
      iss.closedIssues90d !== null && {
        k: "Issues closed",
        v: num(iss.closedIssues90d),
        s: `${num(iss.openIssues)} still open`,
      },
    act && {
      k: "Active contributors",
      v: num(act.authors90d),
      s: "committed in 90 days",
    },
  ].filter(Boolean) as { k: string; v: string; s: string; series?: number[] }[];
  if (!tiles.length) return null;
  return (
    <section className="ra2-health" aria-label="Health snapshot">
      {tiles.map((t) => (
        <div key={t.k} className="ra2-tile">
          <span className="ra2-tile-k">{t.k}</span>
          <strong>{t.v}</strong>
          <span className="ra2-tile-s">{t.s}</span>
          {t.series && <Spark values={t.series} />}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------ 2. activity ------------------------------ */

export function ActivityChart({ commits, merged }: { commits: number[]; merged: number[] }) {
  const max = Math.max(1, ...commits, ...merged);
  const label = (i: number) => {
    const w = 12 - i;
    return w === 0 ? "this week" : w === 1 ? "last week" : `${w} weeks ago`;
  };
  return (
    <div className="ra2-chart">
      <div className="ra2-chart-legend">
        <span>
          <i className="c" /> Commits
        </span>
        <span>
          <i className="m" /> PRs merged
        </span>
      </div>
      <div
        className="ra2-bars"
        role="img"
        aria-label={`Weekly commits, oldest first: ${commits.join(", ")}. Weekly merged pull requests: ${merged.join(", ")}.`}
      >
        {commits.map((c, i) => (
          <div
            key={i}
            className="ra2-week"
            title={`${label(i)}: ${c} commits, ${merged[i]} merged`}
          >
            <span className="c" style={{ height: `${(c / max) * 100}%` }} />
            <span className="m" style={{ height: `${((merged[i] ?? 0) / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="ra2-chart-axis" aria-hidden="true">
        <span>13 weeks ago</span>
        <span>this week</span>
      </div>
    </div>
  );
}

/* ------------------------------ 4. first issues ------------------------------ */

type Issue = { title: string; url: string; created: string; comments: number; assigned: boolean };

export function IssueCards({ issues, all }: { issues: Issue[]; all: string }) {
  const sorted = [...issues].sort((x, y) => Number(x.assigned) - Number(y.assigned));
  return (
    <div className="ra2-issues">
      {sorted.map((i) => (
        <a key={i.url} href={i.url} {...ext} className={`ra2-issue ${i.assigned ? "taken" : ""}`}>
          <span className={`ra2-issue-state ${i.assigned ? "taken" : "free"}`}>
            {i.assigned ? "Assigned" : "Unassigned"}
          </span>
          <strong>{i.title}</strong>
          <span className="ra2-issue-meta">
            Opened {ago(i.created)} · {i.comments} comment{i.comments === 1 ? "" : "s"}
          </span>
          <span className="ra2-issue-go">Open on GitHub ↗</span>
        </a>
      ))}
      <a href={all} {...ext} className="ra2-issue-all">
        See every good first issue ↗
      </a>
    </div>
  );
}

/* ------------------------------ 6 + 12. actions ------------------------------ */

export function RepoActions({ a }: { a: RepoAnalysis }) {
  const [copied, setCopied] = useState<"link" | "summary" | null>(null);
  const copy = async (what: "link" | "summary") => {
    const link = `${window.location.origin}/repositories/analyze?repo=${encodeURIComponent(a.repository)}`;
    const act = a.activity.ok ? a.activity.data : null;
    const iss = a.issues.ok ? a.issues.data : null;
    const text =
      what === "link"
        ? link
        : [
            `${a.repository}${a.about.description ? ` — ${a.about.description}` : ""}`,
            `★ ${num(a.about.stars)} · ${num(a.about.forks)} forks${a.about.license ? ` · ${a.about.license}` : ""}`,
            act
              ? `Last 90 days: ${num(act.commits90d)}${act.commits90d >= 100 ? "+" : ""} commits, ${num(act.mergedPulls90d)} PRs merged, ${act.authors90d} active contributors`
              : null,
            iss?.goodFirstIssues ? `${num(iss.goodFirstIssues)} open good first issues` : null,
            `Analysis: ${link}`,
          ]
            .filter(Boolean)
            .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };
  return (
    <div className="ra2-actions">
      <Link
        className="btn primary ra2-practise"
        href={`/interview?project=${encodeURIComponent(`repo:${a.repository}`)}`}
      >
        Practise an interview on this repo
      </Link>
      <button type="button" className="btn" onClick={() => void copy("link")}>
        {copied === "link" ? "Link copied" : "Copy link"}
      </button>
      <button type="button" className="btn" onClick={() => void copy("summary")}>
        {copied === "summary" ? "Summary copied" : "Copy summary"}
      </button>
    </div>
  );
}

/* ------------------------------ 9. folder tree ------------------------------ */

const READ_FIRST =
  /^(readme|contributing|code_of_conduct|governance|maintainers|security|agents|development|hacking)(\.|$)/i;

function Node({
  owner,
  repo,
  ref,
  entry,
  hint,
}: {
  owner: string;
  repo: string;
  ref: string;
  entry: RepoDirEntry;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [kids, setKids] = useState<RepoDirEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const url = `https://github.com/${owner}/${repo}/${entry.type === "dir" ? "tree" : "blob"}/${encodeURIComponent(ref)}/${entry.path}`;
  if (entry.type === "file")
    return (
      <li className={`ra2-file ${READ_FIRST.test(entry.name) ? "first" : ""}`}>
        <a href={url} {...ext}>
          {entry.name}
        </a>
        {READ_FIRST.test(entry.name) && <span className="ra2-badge">read first</span>}
      </li>
    );
  return (
    <li className={`ra2-dir ${open ? "open" : ""}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={async () => {
          const next = !open;
          setOpen(next);
          if (next && !kids) {
            setLoading(true);
            setKids(await listDirectory(owner, repo, ref, entry.path));
            setLoading(false);
          }
        }}
      >
        <span className="ra2-caret" aria-hidden="true" />
        {entry.name}/
      </button>
      {hint && <span className="ra2-hint">{hint}</span>}
      <a href={url} {...ext} className="ra2-out" aria-label={`Open ${entry.name} on GitHub`}>
        ↗
      </a>
      {open && (
        <ul>
          {loading && <li className="ra2-loading">Loading…</li>}
          {!loading && kids && !kids.length && (
            <li className="ra2-loading">Empty, or GitHub did not answer.</li>
          )}
          {kids?.map((k) => (
            <Node key={k.path} owner={owner} repo={repo} ref={ref} entry={k} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FolderTree({ a }: { a: RepoAnalysis }) {
  if (!a.structure.ok) return null;
  const [owner, repo] = a.repository.split("/") as [string, string];
  return (
    <ul className="ra2-tree">
      {a.structure.data.entries.map((e) => (
        <Node
          key={e.name}
          owner={owner}
          repo={repo}
          ref={a.about.defaultBranch}
          entry={{ name: e.name, path: e.name, type: e.type }}
          hint={e.hint}
        />
      ))}
    </ul>
  );
}

/* ------------------------------ 10. skeleton ------------------------------ */

export function AnalyzeSkeleton() {
  return (
    <div
      className="ra2-skel"
      data-testid="analyze-loading"
      aria-label="Reading the repository from GitHub"
    >
      <div className="card ra2-skel-head">
        <span className="sk w30" />
        <span className="sk h28 w60" />
        <span className="sk w80" />
        <div className="ra2-skel-row">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className="sk h40" />
          ))}
        </div>
      </div>
      <div className="ra2-health">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="ra2-tile">
            <span className="sk w50" />
            <span className="sk h28 w40" />
            <span className="sk h20" />
          </div>
        ))}
      </div>
      <div className="card">
        <span className="sk w30" />
        <span className="sk h120" />
      </div>
      <p className="muted ra2-skel-note">Reading the repository from GitHub…</p>
    </div>
  );
}

/* ------------------------------ 11. recently analysed ------------------------------ */

export interface RecentRepo {
  slug: string;
  at: string;
  description: string | null;
  language: string | null;
  stars: number;
}
const RECENT_KEY = "osx.analyze.recent.v1";

const readRecent = (): RecentRepo[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeRecent = (list: RecentRepo[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
};

/** Remembers an analysed repository in this browser (newest first, twelve kept). */
export function rememberRepo(a: RepoAnalysis) {
  const entry: RecentRepo = {
    slug: a.repository,
    at: new Date().toISOString(),
    description: a.about.description,
    language: a.about.mainLanguage,
    stars: a.about.stars,
  };
  writeRecent(
    [
      entry,
      ...readRecent().filter((r) => r.slug.toLowerCase() !== a.repository.toLowerCase()),
    ].slice(0, 12),
  );
  window.dispatchEvent(new Event("osx-recent-repos"));
}

export function RecentRepos({
  onPick,
  disabled,
}: {
  onPick: (slug: string) => void;
  disabled: boolean;
}) {
  const [list, setList] = useState<RecentRepo[]>([]);
  useEffect(() => {
    const load = () => setList(readRecent());
    load();
    window.addEventListener("osx-recent-repos", load);
    return () => window.removeEventListener("osx-recent-repos", load);
  }, []);
  if (!list.length) return null;
  const remove = (slug: string) => {
    const next = readRecent().filter((r) => r.slug !== slug);
    writeRecent(next);
    setList(next);
  };
  return (
    <section className="card ra2-recent" aria-labelledby="ra2-recent-h">
      <div className="ra2-recent-head">
        <h2 id="ra2-recent-h">Recently analysed</h2>
        <ConfirmDelete
          what="all recent repositories"
          onConfirm={() => {
            writeRecent([]);
            setList([]);
          }}
        />
      </div>
      <ul>
        {list.map((r) => (
          <li key={r.slug}>
            <button
              type="button"
              className="ra2-recent-open"
              disabled={disabled}
              onClick={() => onPick(r.slug)}
            >
              <strong>{r.slug}</strong>
              <span className="muted">
                {[r.language, `★ ${num(r.stars)}`, ago(r.at)].filter(Boolean).join(" · ")}
              </span>
              {r.description && <span className="ra2-recent-desc">{r.description}</span>}
            </button>
            <ConfirmDelete compact what={r.slug} onConfirm={() => remove(r.slug)} />
          </li>
        ))}
      </ul>
      <p className="hint">Kept only in this browser.</p>
    </section>
  );
}
