"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { analyzeRepository, type AnalyzeResult } from "@/app/(app)/repositories/analyze/actions";
import { Notice } from "@/components/feedback/Notice";
import { StatusChip } from "@/components/status/StatusChip";
import { SaveButton } from "@/features/saved/SaveButton";
import type { ActivityStatus, RepoAnalysis, Section } from "@/lib/repo-analysis";
import {
  ActivityChart,
  AnalyzeSkeleton,
  FolderTree,
  HealthTiles,
  IssueCards,
  ProjectExplain,
  RecentRepos,
  RepoActions,
  rememberRepo,
} from "./AnalysisExtras";

const EXAMPLES = ["kubernetes/kubernetes", "volcano-sh/volcano", "ControlCore-Project/concore"];

const STATUS_TEXT: Record<ActivityStatus, { label: string; status: string; hint: string }> = {
  active: {
    label: "Active",
    status: "CONFIRMED",
    hint: "Commits in most weeks, or many pull requests merged recently.",
  },
  steady: {
    label: "Steady",
    status: "CONFIRMED",
    hint: "Regular commits or merged pull requests in the last 90 days.",
  },
  slowing: {
    label: "Some recent activity",
    status: "INFERRED",
    hint: "A little work in the last 90 days.",
  },
  quiet: { label: "Quiet", status: "STALE", hint: "No commits or merges in the last 90 days." },
  inactive: { label: "Inactive", status: "STALE", hint: "Nothing pushed for over a year." },
  archived: { label: "Archived", status: "STALE", hint: "Read-only: the owners archived it." },
};

const LANG_COLORS = [
  "var(--accent)",
  "var(--rec)",
  "var(--fc)",
  "var(--inf)",
  "var(--ok)",
  "var(--hist)",
  "var(--stale)",
  "var(--unk)",
];

const num = (n: number) => n.toLocaleString("en-US");
const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
function ago(iso: string) {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (d < 1) return "today";
  if (d === 1) return "yesterday";
  if (d < 60) return `${d} days ago`;
  if (d < 730) return `${Math.round(d / 30)} months ago`;
  return `${Math.round(d / 365)} years ago`;
}
const ext = { target: "_blank", rel: "noreferrer noopener" } as const;

function Panel({
  title,
  section,
  children,
}: {
  title: string;
  section?: Section<unknown>;
  children: ReactNode;
}) {
  return (
    <section className="card ra-panel" aria-label={title}>
      <h3 className="ra-h">{title}</h3>
      {section && !section.ok ? (
        <p className="muted" data-testid="ra-section-error">
          Could not load: {section.error}.
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function Fact({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="ra-fact">
      <div className="ra-fact-v">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** First steps built only from what GitHub returned for this repository. */
function nextSteps(a: RepoAnalysis): ReactNode[] {
  const steps: ReactNode[] = [];
  const files = a.community.ok ? a.community.data.files : [];
  const contributing = files.find((f) => f.label === "Contributing guide")?.url;
  const readFirst = a.structure.ok ? a.structure.data.readFirst : [];
  if (a.about.archived)
    return [
      <>
        This repository is archived, so it does not accept contributions. Look for an active fork or
        the project&apos;s newer home.
      </>,
    ];
  steps.push(
    contributing ? (
      <>
        Read the{" "}
        <a href={contributing} {...ext}>
          contributing guide
        </a>
        {readFirst.filter((f) => !/^(README|CONTRIBUTING)/i.test(f)).length
          ? ` and ${readFirst.filter((f) => !/^(README|CONTRIBUTING)/i.test(f)).join(", ")}`
          : ""}{" "}
        before your first change.
      </>
    ) : (
      <>
        There is no contributing guide, so read the{" "}
        <a href={`${a.url}#readme`} {...ext}>
          README
        </a>{" "}
        and a few merged pull requests to learn how changes are made.
      </>
    ),
  );
  if (a.issues.ok) {
    const i = a.issues.data;
    if (i.goodFirstIssues)
      steps.push(
        <>
          Pick one of the{" "}
          <a href={i.goodFirstIssuesUrl} {...ext}>
            {num(i.goodFirstIssues)} open good first issues
          </a>{" "}
          that nobody is assigned to, and comment before you start.
        </>,
      );
    else if (i.helpWanted)
      steps.push(
        <>
          There are no good first issues; look at the{" "}
          <a href={i.helpWantedUrl} {...ext}>
            {num(i.helpWanted)} help wanted issues
          </a>
          .
        </>,
      );
    else if (i.issuesEnabled)
      steps.push(
        <>
          No issue is labelled for newcomers. Browse{" "}
          <a href={`${a.url}/issues`} {...ext}>
            open issues
          </a>{" "}
          and ask the maintainers which one suits a first contribution.
        </>,
      );
  }
  if (a.structure.ok && a.structure.data.tech.includes("Ready-made dev environment"))
    steps.push(
      <>
        A ready-made dev environment (Dev Container or Gitpod) is set up, so you can start coding
        without local setup.
      </>,
    );
  if (a.activity.ok && a.activity.data.branch !== a.about.defaultBranch)
    steps.push(
      <>
        Recent pull requests are merged into <code>{a.activity.data.branch}</code>, not{" "}
        <code>{a.about.defaultBranch}</code>: branch from <code>{a.activity.data.branch}</code>{" "}
        unless the guide says otherwise.
      </>,
    );
  if (a.activity.ok && ["quiet", "inactive"].includes(a.activity.data.status))
    steps.push(
      <>
        Activity is low, so a pull request may wait a long time for review. Check that maintainers
        still respond before you invest a lot of work.
      </>,
    );
  return steps;
}

function Analysis({ a, found }: { a: RepoAnalysis; found: AnalyzeResult["inOpenSourceX"] }) {
  const act = a.activity.ok ? a.activity.data : null;
  const st = act ? STATUS_TEXT[act.status] : a.about.archived ? STATUS_TEXT.archived : null;
  const steps = nextSteps(a);
  return (
    <div className="ra" data-testid="analysis">
      <div className="card ra-head">
        <div className="chips">
          <StatusChip status="CONFIRMED" label="Live from GitHub" />
          {st && <StatusChip status={st.status} label={st.label} />}
          {a.about.fork && <StatusChip status="INFERRED" label="Fork" />}
        </div>
        <h2 className="ra-title">
          <a href={a.url} {...ext}>
            {a.repository}
          </a>
        </h2>
        {a.about.description && <p className="sub ra-desc">{a.about.description}</p>}
        {a.about.fork && (
          <p className="muted">
            Fork of{" "}
            <a href={a.about.fork.url} {...ext}>
              {a.about.fork.of}
            </a>
            ; contributions usually go to the original.
          </p>
        )}
        <div className="ra-facts">
          <Fact value={num(a.about.stars)} label="stars" />
          <Fact value={num(a.about.forks)} label="forks" />
          {a.contributors.ok && (
            <Fact
              value={`${num(a.contributors.data.total)}${a.contributors.data.capped ? "+" : ""}`}
              label="contributors"
            />
          )}
          <Fact value={a.about.license ?? "None"} label="licence" />
          <Fact value={ago(a.about.lastPush)} label="last push" />
        </div>
        {(a.about.homepage || a.about.topics.length > 0) && (
          <div className="chips" style={{ marginTop: 14 }}>
            {a.about.homepage && (
              <a className="tag" href={a.about.homepage} {...ext}>
                Website ↗
              </a>
            )}
            {a.about.topics.map((t) => (
              <span className="tag" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
        <RepoActions a={a} />
      </div>

      <ProjectExplain slug={a.repository} />

      <HealthTiles a={a} />

      {steps.length > 0 && (
        <section className="card ra-panel ra-steps" aria-label="How to start contributing">
          <h3 className="ra-h">How to start contributing</h3>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
      )}

      {found && (found.org || found.mentorships.length > 0) && (
        <section className="card ra-panel" aria-label="In OpenSourceX">
          <h3 className="ra-h">In OpenSourceX</h3>
          {found.org && (
            <>
              <p style={{ margin: "0 0 8px" }}>
                <strong>{found.org.name}</strong> takes part in{" "}
                {found.org.programs.map((p, i) => (
                  <span key={p.page + i}>
                    {i > 0 && ", "}
                    <Link href={p.page}>{p.name}</Link>
                    {p.years.length > 0 && (
                      <span className="muted">
                        {" "}
                        (
                        {p.years.length > 3
                          ? `${p.years[0]}–${p.years.at(-1)}`
                          : p.years.join(", ")}
                        )
                      </span>
                    )}
                  </span>
                ))}
                .
              </p>
              {found.org.chats.length > 0 && (
                <ul className="crit">
                  {found.org.chats.map((c) => (
                    <li key={c.joinUrl + (c.channels?.join() ?? "")}>
                      <a href={c.joinUrl} {...ext}>
                        {c.workspace}
                      </a>
                      <span className="muted">
                        {" "}
                        · {c.platform}
                        {c.channels?.length ? ` · ${c.channels.join(", ")}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {found.mentorships.length > 0 && (
            <>
              <p style={{ margin: "14px 0 8px" }}>
                {found.mentorships.length} LFX Mentorship{" "}
                {found.mentorships.length === 1 ? "project was" : "projects were"} based in this
                repository:
              </p>
              <ul className="crit">
                {found.mentorships.slice(0, 8).map((m) => (
                  <li key={m.page}>
                    <Link href={m.page}>{m.title}</Link>
                    <span className="muted"> · {m.term}</span>
                  </li>
                ))}
              </ul>
              {found.mentorships.length > 8 && (
                <p className="hint">{found.mentorships.length - 8} more not shown.</p>
              )}
            </>
          )}
        </section>
      )}

      <div className="grid g2e">
        <Panel title="Activity" section={a.activity}>
          {act && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                {st?.hint}
              </p>
              <ActivityChart commits={act.weeklyCommits} merged={act.weeklyMerged} />
              <dl className="kv">
                <dt>Commits, 90 days</dt>
                <dd>
                  {num(act.commits90d)}
                  {act.commits90d >= 100 ? "+" : ""} on <code>{act.branch}</code>
                  {act.branch !== a.about.defaultBranch && (
                    <span className="muted"> (where pull requests are merged)</span>
                  )}
                </dd>
                <dt>Weeks with commits</dt>
                <dd>{act.weeksWithCommits} of the last 13</dd>
                <dt>Commit authors</dt>
                <dd>{act.authors90d} in 90 days</dd>
                <dt>Last commit</dt>
                <dd>
                  {act.lastCommit ? (
                    act.lastCommitUrl ? (
                      <a href={act.lastCommitUrl} {...ext}>
                        {date(act.lastCommit)} ({ago(act.lastCommit)})
                      </a>
                    ) : (
                      date(act.lastCommit)
                    )
                  ) : (
                    "none"
                  )}
                </dd>
                <dt>Merged PRs, 90 days</dt>
                <dd>
                  {num(act.mergedPulls90d)}
                  {act.mergedCapped ? "+" : ""}
                </dd>
                <dt>Open PRs</dt>
                <dd>
                  <a href={`${a.url}/pulls`} {...ext}>
                    {num(act.openPulls)}
                  </a>
                </dd>
              </dl>
            </>
          )}
        </Panel>

        <Panel title="Issues" section={a.issues}>
          {a.issues.ok && (
            <>
              {!a.issues.data.issuesEnabled && (
                <p className="muted">Issues are turned off for this repository.</p>
              )}
              <dl className="kv">
                <dt>Open issues</dt>
                <dd>
                  <a href={`${a.url}/issues`} {...ext}>
                    {num(a.issues.data.openIssues)}
                  </a>
                </dd>
                {a.issues.data.closedIssues90d !== null && (
                  <>
                    <dt>Closed, 90 days</dt>
                    <dd>{num(a.issues.data.closedIssues90d)}</dd>
                  </>
                )}
                <dt>Good first issues</dt>
                <dd>
                  <a href={a.issues.data.goodFirstIssuesUrl} {...ext}>
                    {num(a.issues.data.goodFirstIssues ?? 0)}
                  </a>
                </dd>
                <dt>Help wanted</dt>
                <dd>
                  <a href={a.issues.data.helpWantedUrl} {...ext}>
                    {num(a.issues.data.helpWanted)}
                  </a>
                </dd>
              </dl>
              {a.issues.data.recentGoodFirstIssues.length > 0 && (
                <>
                  <h4 className="ra-sub">Newest good first issues</h4>
                  <IssueCards
                    issues={a.issues.data.recentGoodFirstIssues}
                    all={a.issues.data.goodFirstIssuesUrl}
                  />
                </>
              )}
            </>
          )}
        </Panel>

        <Panel title="Languages and technology" section={a.languages}>
          {a.languages.ok && (
            <>
              {a.languages.data.length > 0 ? (
                <>
                  <div className="ra-langbar" role="img" aria-label="Language shares">
                    {a.languages.data.map((l, i) => (
                      <span
                        key={l.name}
                        style={{
                          width: `${l.share}%`,
                          background: LANG_COLORS[i % LANG_COLORS.length],
                        }}
                        title={`${l.name} ${l.share}%`}
                      />
                    ))}
                  </div>
                  <ul className="ra-langs">
                    {a.languages.data.map((l, i) => (
                      <li key={l.name}>
                        <span
                          className="ra-dot"
                          style={{ background: LANG_COLORS[i % LANG_COLORS.length] }}
                          aria-hidden="true"
                        />
                        {l.name} <span className="muted">{l.share}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="muted">GitHub detected no languages.</p>
              )}
              {a.structure.ok && a.structure.data.tech.length > 0 && (
                <>
                  <h4 className="ra-sub">Built with</h4>
                  <div className="chips">
                    {a.structure.data.tech.map((t) => (
                      <span className="tag" key={t}>
                        {t}
                      </span>
                    ))}
                    {a.structure.data.workflows ? (
                      <span className="tag">
                        GitHub Actions ({a.structure.data.workflows} workflow
                        {a.structure.data.workflows === 1 ? "" : "s"})
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </>
          )}
        </Panel>

        <Panel title="Contribution docs" section={a.community}>
          {a.community.ok && (
            <>
              <ul className="ra-docs">
                {a.community.data.files.map((f) => (
                  <li key={f.label} className={f.url ? "has" : "missing"}>
                    <span aria-hidden="true">{f.url ? "✓" : "–"}</span>
                    {f.url ? (
                      <a href={f.url} {...ext}>
                        {f.label}
                      </a>
                    ) : (
                      <span className="muted">{f.label}: none</span>
                    )}
                  </li>
                ))}
                {a.community.data.discussions && (
                  <li className="has">
                    <span aria-hidden="true">✓</span>
                    <a href={`${a.url}/discussions`} {...ext}>
                      GitHub Discussions
                    </a>
                  </li>
                )}
              </ul>
              {a.community.data.healthPercentage !== null && (
                <p className="hint">
                  GitHub&apos;s community profile marks {a.community.data.healthPercentage}% of its
                  recommended files as present.
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel title="Contributors" section={a.contributors}>
          {a.contributors.ok && (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                {num(a.contributors.data.total)}
                {a.contributors.data.capped ? "+" : ""} people have commits on the default branch.
                Most commits:
              </p>
              <ul className="crit">
                {a.contributors.data.top.map((c) => (
                  <li key={c.login}>
                    <a href={c.url} {...ext}>
                      @{c.login}
                    </a>
                    <span className="muted"> · {num(c.contributions)} commits</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel title="Releases" section={a.releases}>
          {a.releases.ok && (
            <dl className="kv">
              <dt>Latest</dt>
              <dd>
                {a.releases.data.latest ? (
                  <a href={a.releases.data.latest.url} {...ext}>
                    {a.releases.data.latest.name || a.releases.data.latest.tag} ·{" "}
                    {date(a.releases.data.latest.published)}
                  </a>
                ) : a.releases.data.tags ? (
                  <a href={`${a.url}/tags`} {...ext}>
                    No GitHub releases; {num(a.releases.data.tags)} version tags
                  </a>
                ) : (
                  "No releases or tags"
                )}
              </dd>
              <dt>Releases</dt>
              <dd>
                {num(a.releases.data.total)}
                {a.releases.data.total >= 30 ? "+" : ""} in total, {a.releases.data.last12m} in the
                last 12 months
              </dd>
              <dt>Created</dt>
              <dd>{date(a.about.created)}</dd>
            </dl>
          )}
        </Panel>
      </div>

      <Panel title="Repository structure" section={a.structure}>
        {a.structure.ok && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Top level of <code>{a.about.defaultBranch}</code>. Open a folder to look inside.
              {a.structure.data.readFirst.length > 0 &&
                ` Read first: ${a.structure.data.readFirst.join(", ")}.`}
            </p>
            <FolderTree a={a} />
          </>
        )}
      </Panel>

      <p className="hint" style={{ marginTop: 14 }}>
        Live from the GitHub REST API at {new Date(a.fetchedAt).toUTCString().slice(5, 22)} UTC.
        Figures are GitHub&apos;s own; nothing here is a score.
        {!a.authenticated && " Results are kept for 30 minutes to stay within GitHub's free limit."}
      </p>
    </div>
  );
}

export function AnalyzeForm({ initial = "" }: { initial?: string }) {
  const [url, setUrl] = useState(initial);
  const [res, setRes] = useState<AnalyzeResult | null>(null);
  const [pending, start] = useTransition();
  const run = (value: string) =>
    start(async () => {
      const r = await analyzeRepository(value);
      setRes(r);
      if (r.state === "repo" && r.analysis) rememberRepo(r.analysis);
    });
  // "Analyze this repository" links from project pages open with ?repo= and run at once
  const ran = useRef(false);
  useEffect(() => {
    if (initial && !ran.current) {
      ran.current = true;
      run(initial);
    }
  }, [initial]);

  return (
    <div>
      <form
        className="ra-search"
        onSubmit={(e) => {
          e.preventDefault();
          run(url);
        }}
        aria-label="Analyze a repository"
      >
        <label htmlFor="repo-url" className="ra-search-label">
          GitHub repository URL
        </label>
        <div className="ra-search-bar">
          <svg
            className="ra-search-gh"
            viewBox="0 0 16 16"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.22 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.19c0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
            />
          </svg>
          <input
            id="repo-url"
            type="text"
            name="url"
            required
            placeholder="github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby="repo-hint"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="ra-search-go" type="submit" disabled={pending}>
            {pending ? "Analyzing…" : "Analyze repository"}
          </button>
        </div>
        <p id="repo-hint" className="ra-search-hint">
          A github.com repository URL, or just owner/repo. Issue and pull request links work too.
        </p>
        <div className="ra-try">
          <span>Try</span>
          {EXAMPLES.map((x) => (
            <button
              key={x}
              type="button"
              className="ra-try-chip"
              onClick={() => {
                setUrl(`https://github.com/${x}`);
                run(`https://github.com/${x}`);
              }}
              disabled={pending}
            >
              {x}
            </button>
          ))}
        </div>
      </form>

      {!res && !pending && (
        <RecentRepos
          disabled={pending}
          onPick={(slug) => {
            setUrl(`https://github.com/${slug}`);
            run(`https://github.com/${slug}`);
          }}
        />
      )}

      <div aria-live="polite" aria-busy={pending} style={{ marginTop: 16 }}>
        {pending && <AnalyzeSkeleton />}
        {!pending && res && res.state !== "repo" && (
          <Notice kind="err" testId="analyze-invalid">
            {res.message}
          </Notice>
        )}
        {!pending && res && res.state === "repo" && (
          <div className="fade" data-testid="analyze-result">
            {res.analysisError && (
              <div style={{ marginBottom: 12 }}>
                <Notice kind="dev" testId="analyze-unavailable">
                  {res.analysisError}
                </Notice>
              </div>
            )}
            {res.analysis && <Analysis a={res.analysis} found={res.inOpenSourceX} />}
            <div className="card" style={{ marginTop: 16 }}>
              <dl className="kv" style={{ marginTop: 0 }}>
                <dt>Repository</dt>
                <dd className="mono">
                  {res.owner}/{res.repo}
                </dd>
                <dt>Canonical URL</dt>
                <dd>
                  <a href={res.canonical} {...ext}>
                    {res.canonical}
                  </a>
                </dd>
                {res.note && (
                  <>
                    <dt>Note</dt>
                    <dd>{res.note}</dd>
                  </>
                )}
              </dl>
              {res.canonical && (
                <div className="actions" style={{ marginTop: 16 }} data-testid="analyze-save">
                  <SaveButton
                    key={res.canonical}
                    entityType="REPOSITORY"
                    entityId={res.canonical}
                    initialSaved={!!res.saved}
                    label="repository"
                  />
                </div>
              )}
              {res.recorded.length > 0 && (
                <>
                  <h3 style={{ marginTop: 16 }}>In the recorded projects</h3>
                  <ul className="crit">
                    {res.recorded.map((r) => (
                      <li key={r.id}>
                        <Link href={`/projects/${r.id}`}>{r.name}</Link>
                        <span className="muted">· {r.program.name}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
