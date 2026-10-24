"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  compareRepositories,
  explainRepository,
  type AnalyzeResult,
} from "@/app/(app)/repositories/analyze/actions";
import { Notice } from "@/components/feedback/Notice";
import type { RepoExplanation } from "@/lib/repo-explain";
import type { RepoAnalysis } from "@/lib/repo-analysis";
import { Envelope, slugOf, type EnvelopePhase } from "./Envelope";
import { PostcardActions } from "./Postcard";

const num = (n: number) => n.toLocaleString("en-US");
const date = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";

const STATUS: Record<string, string> = {
  archived: "Archived",
  active: "Active",
  steady: "Steady",
  slowing: "Slowing",
  quiet: "Quiet",
  inactive: "Inactive",
};

const PAIRS = [
  ["volcano-sh/volcano", "kubernetes-sigs/kueue"],
  ["prometheus/prometheus", "grafana/loki"],
];

type Row = {
  label: string;
  /** only worth a row when an AI explanation came back; the data one repeats "About" */
  ai?: boolean;
  cell: (a: RepoAnalysis, x?: RepoExplanation | null) => ReactNode;
};

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "What it is",
    rows: [
      { label: "About", cell: (a) => a.about.description ?? "—" },
      {
        label: "What it does",
        ai: true,
        cell: (_a, x) => (x === undefined ? <span className="cmp-wait" /> : (x?.what ?? "—")),
      },
      { label: "Main language", cell: (a) => a.about.mainLanguage ?? "—" },
      {
        label: "Languages",
        cell: (a) =>
          a.languages.ok && a.languages.data.length ? <LangBar langs={a.languages.data} /> : "—",
      },
      {
        label: "Tech stack",
        cell: (a, x) => {
          const names = x?.stack.length
            ? x.stack.map((s) => s.name)
            : a.structure.ok
              ? a.structure.data.tech
              : [];
          if (x === undefined && !names.length) return <span className="cmp-wait" />;
          return names.length ? <Chips items={names.slice(0, 8)} /> : "—";
        },
      },
      {
        label: "Runs on",
        cell: (_a, x) =>
          x === undefined ? (
            <span className="cmp-wait" />
          ) : x?.runsOn.length ? (
            <Chips items={x.runsOn.slice(0, 6)} />
          ) : (
            "—"
          ),
      },
      { label: "Licence", cell: (a) => a.about.license ?? "—" },
    ],
  },
  {
    group: "Community",
    rows: [
      { label: "Stars", cell: (a) => num(a.about.stars) },
      { label: "Forks", cell: (a) => num(a.about.forks) },
      {
        label: "Contributors",
        cell: (a) =>
          a.contributors.ok
            ? `${num(a.contributors.data.total)}${a.contributors.data.capped ? "+" : ""}`
            : "—",
      },
      {
        label: "Community health",
        cell: (a) =>
          a.community.ok && a.community.data.healthPercentage != null
            ? `${a.community.data.healthPercentage}%`
            : "—",
      },
    ],
  },
  {
    group: "Activity, last 90 days",
    rows: [
      {
        label: "Status",
        cell: (a) =>
          a.activity.ok ? (
            <span className={`cmp-status cmp-${a.activity.data.status}`}>
              {STATUS[a.activity.data.status] ?? a.activity.data.status}
            </span>
          ) : (
            "—"
          ),
      },
      {
        label: "Weekly commits",
        cell: (a) => (a.activity.ok ? <Spark values={a.activity.data.weeklyCommits} /> : "—"),
      },
      {
        label: "Commits",
        cell: (a) =>
          a.activity.ok
            ? `${num(a.activity.data.commits90d)}${a.activity.data.commitsCapped ? "+" : ""}`
            : "—",
      },
      {
        label: "People committing",
        cell: (a) => (a.activity.ok ? num(a.activity.data.authors90d) : "—"),
      },
      {
        label: "Pull requests merged",
        cell: (a) =>
          a.activity.ok
            ? `${num(a.activity.data.mergedPulls90d)}${a.activity.data.mergedCapped ? "+" : ""}`
            : "—",
      },
      {
        label: "Open pull requests",
        cell: (a) => (a.activity.ok ? num(a.activity.data.openPulls) : "—"),
      },
      { label: "Last push", cell: (a) => date(a.about.lastPush) },
    ],
  },
  {
    group: "Getting started",
    rows: [
      { label: "Open issues", cell: (a) => (a.issues.ok ? num(a.issues.data.openIssues) : "—") },
      {
        label: "Good first issues",
        cell: (a) =>
          a.issues.ok && a.issues.data.goodFirstIssues != null ? (
            <a href={a.issues.data.goodFirstIssuesUrl} target="_blank" rel="noopener noreferrer">
              {num(a.issues.data.goodFirstIssues)}
            </a>
          ) : (
            "—"
          ),
      },
      {
        label: "Help wanted",
        cell: (a) =>
          a.issues.ok ? (
            <a href={a.issues.data.helpWantedUrl} target="_blank" rel="noopener noreferrer">
              {num(a.issues.data.helpWanted)}
            </a>
          ) : (
            "—"
          ),
      },
      {
        label: "Skills you need",
        cell: (_a, x) =>
          x === undefined ? (
            <span className="cmp-wait" />
          ) : x?.skills.length ? (
            <Chips items={x.skills.slice(0, 6).map((s) => s.name)} />
          ) : (
            "—"
          ),
      },
      {
        label: "Read first",
        cell: (a) =>
          a.structure.ok && a.structure.data.readFirst.length ? (
            <Chips items={a.structure.data.readFirst.slice(0, 5)} mono />
          ) : (
            "—"
          ),
      },
    ],
  },
  {
    group: "Releases",
    rows: [
      {
        label: "Latest release",
        cell: (a) =>
          a.releases.ok && a.releases.data.latest ? (
            <a href={a.releases.data.latest.url} target="_blank" rel="noopener noreferrer">
              {a.releases.data.latest.tag} · {date(a.releases.data.latest.published)}
            </a>
          ) : (
            "—"
          ),
      },
      {
        label: "Releases in 12 months",
        cell: (a) => (a.releases.ok ? num(a.releases.data.last12m) : "—"),
      },
      { label: "Created", cell: (a) => date(a.about.created) },
    ],
  },
];

function Chips({ items, mono = false }: { items: string[]; mono?: boolean }) {
  return (
    <span className="cmp-chips">
      {items.map((t) => (
        <span key={t} className={mono ? "mono" : undefined}>
          {t}
        </span>
      ))}
    </span>
  );
}

const LANG_COLORS = ["#7d9bff", "#9b7dff", "#5ad1e6", "#f5b84b", "#60a5fa", "#94a3b8"];

function LangBar({ langs }: { langs: { name: string; share: number }[] }) {
  const top = langs.slice(0, 5);
  return (
    <span className="cmp-lang">
      <span className="cmp-lang-bar">
        {top.map((l, i) => (
          <i key={l.name} style={{ width: `${l.share}%`, background: LANG_COLORS[i] }} />
        ))}
      </span>
      <span className="cmp-lang-keys">
        {top.slice(0, 3).map((l, i) => (
          <span key={l.name}>
            <i style={{ background: LANG_COLORS[i] }} />
            {l.name} {Math.round(l.share)}%
          </span>
        ))}
      </span>
    </span>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 160;
  const h = 34;
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map(
    (v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`,
  );
  return (
    <svg
      className="cmp-spark"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      aria-label={`Commits per week: ${values.join(", ")}`}
    >
      <polyline points={`0,${h} ${pts.join(" ")} ${w},${h}`} className="cmp-spark-fill" />
      <polyline points={pts.join(" ")} className="cmp-spark-line" />
    </svg>
  );
}

export function CompareForm({
  initialA = "",
  initialB = "",
}: {
  initialA?: string;
  initialB?: string;
}) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [res, setRes] = useState<[AnalyzeResult, AnalyzeResult] | null>(null);
  const [explain, setExplain] = useState<
    [RepoExplanation | null | undefined, RepoExplanation | null | undefined]
  >([undefined, undefined]);
  const [pending, start] = useTransition();

  const run = (x: string, y: string) =>
    start(async () => {
      setExplain([undefined, undefined]);
      const r = await compareRepositories(x, y);
      setRes(r);
      const q = new URLSearchParams();
      const sa = slugOf(x);
      const sb = slugOf(y);
      if (sa) q.set("a", sa);
      if (sb) q.set("b", sb);
      window.history.replaceState(null, "", `?${q}`);
      // the explanations take longer; the table shows first and they fill in
      const slugs = r.map((v) => (v.state === "repo" && v.analysis ? v.analysis.repository : null));
      void Promise.all(slugs.map((s) => (s ? explainRepository(s).catch(() => null) : null))).then(
        ([ea, eb]) => setExplain([ea ?? null, eb ?? null]),
      );
    });

  const ran = useRef(false);
  useEffect(() => {
    if (initialA && initialB && !ran.current) {
      ran.current = true;
      run(initialA, initialB);
    }
  }, [initialA, initialB]);

  const phase = (i: 0 | 1): EnvelopePhase =>
    pending
      ? "sending"
      : res?.[i].state === "repo" && res[i].analysis
        ? "done"
        : res && res[i].state !== "repo"
          ? "error"
          : "idle";

  const both =
    res && res[0].analysis && res[1].analysis
      ? ([res[0].analysis, res[1].analysis] as const)
      : null;

  return (
    <div>
      <form
        className="ra-search cmp-search"
        onSubmit={(e) => {
          e.preventDefault();
          run(a, b);
        }}
        aria-label="Compare two repositories"
      >
        <div className="cmp-inputs">
          {(
            [
              ["cmp-a", "First repository", a, setA],
              ["cmp-b", "Second repository", b, setB],
            ] as const
          ).map(([id, label, value, set], i) => (
            <div key={id} className="cmp-field">
              <label htmlFor={id} className="ra-search-label">
                {label}
              </label>
              <div className="ra-search-bar">
                <span className="cmp-badge">{i === 0 ? "A" : "B"}</span>
                <input
                  id={id}
                  type="text"
                  required
                  placeholder="github.com/owner/repo"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>
          ))}
          <span className="cmp-vs" aria-hidden="true">
            vs
          </span>
        </div>
        <div className="cmp-submit">
          <div className="ra-try">
            <span>Try</span>
            {PAIRS.map(([x, y]) => (
              <button
                key={x}
                type="button"
                className="ra-try-chip"
                disabled={pending}
                onClick={() => {
                  setA(x!);
                  setB(y!);
                  run(x!, y!);
                }}
              >
                {x!.split("/")[1]} vs {y!.split("/")[1]}
              </button>
            ))}
          </div>
          <button
            className="ra-search-go"
            type="submit"
            disabled={pending}
            data-testid="compare-go"
          >
            {pending ? "Comparing…" : "Compare"}
          </button>
        </div>
      </form>

      <div className="cmp-envs">
        {([0, 1] as const).map((i) => (
          <Envelope
            key={i}
            value={i === 0 ? a : b}
            phase={phase(i)}
            analysis={res?.[i].state === "repo" ? res[i].analysis : null}
            onDropLink={(link) => {
              if (i === 0) {
                setA(link);
                if (b) run(link, b);
              } else {
                setB(link);
                if (a) run(a, link);
              }
            }}
          />
        ))}
      </div>

      <div aria-live="polite" aria-busy={pending}>
        {!pending &&
          res?.map(
            (r, i) =>
              (r.state !== "repo" || r.analysisError) && (
                <div key={i} style={{ marginTop: 12 }}>
                  <Notice kind="err" testId="compare-error">
                    {i === 0 ? "A" : "B"}: {r.state !== "repo" ? r.message : r.analysisError}
                  </Notice>
                </div>
              ),
          )}
        {!pending && both && (
          <div className="cmp-table ra-unfold" data-testid="compare-table">
            <div className="cmp-head">
              <span />
              {both.map((x, i) => (
                <div key={x.repository} className="cmp-head-cell">
                  <span className="cmp-badge">{i === 0 ? "A" : "B"}</span>
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="cmp-name">
                    {x.repository}
                  </a>
                  <div className="cmp-head-links">
                    <Link href={`/repositories/analyze?repo=${encodeURIComponent(x.repository)}`}>
                      Full analysis
                    </Link>
                    <Link href={`/interview?project=${encodeURIComponent(`repo:${x.repository}`)}`}>
                      Practise an interview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            {ROWS.map((g) => (
              <section key={g.group} className="cmp-group">
                <h3>{g.group}</h3>
                {g.rows
                  .filter(
                    (row) => !row.ai || explain.some((x) => x === undefined || x?.by === "ai"),
                  )
                  .map((row) => (
                    <div key={row.label} className="cmp-row">
                      <span className="cmp-label">{row.label}</span>
                      {both.map((x, i) => (
                        <div key={x.repository} className="cmp-cell">
                          {row.cell(x, explain[i])}
                        </div>
                      ))}
                    </div>
                  ))}
              </section>
            ))}
            <div className="cmp-row cmp-share">
              <span className="cmp-label">Postcard</span>
              {both.map((x) => (
                <div key={x.repository} className="cmp-cell">
                  <PostcardActions a={x} compact />
                </div>
              ))}
            </div>
            <p className="hint" style={{ margin: "14px 0 0" }}>
              Read live from GitHub. Nothing here is a score: the numbers sit side by side so you
              can decide what matters for you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
