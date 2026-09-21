import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProject } from "@opensourcex/database";
import { load } from "@/lib/data";
import { DbDown, Notice } from "@/components/feedback/Notice";
import { SourceBadge } from "@/components/source/SourceBadge";
import { SourcePanel } from "@/components/source/SourcePanel";
import { StatusChip } from "@/components/status/StatusChip";
import { TermRibbon } from "@/components/data-display/TermRibbon";

export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Project ${id}` };
}

const TABS = [
  "overview",
  "history",
  "technologies",
  "repository",
  "mentors",
  "contribution",
  "sources",
] as const;

export default async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await load((d) => getProject(d, id));
  if (!res.ok)
    return (
      <div className="wrap" style={{ paddingTop: 32 }}>
        <DbDown />
      </div>
    );
  if (!res.data) notFound();
  const { card: p, detail, sources } = res.data;
  const mentorship = p.kind === "mentorship";

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="spine" aria-label="Ecosystem path">
        <Link href="/programs">{p.program.name}</Link>›
        {p.ecosystem && (
          <>
            <span className="pill">{p.ecosystem} ecosystem</span>›
          </>
        )}
        {p.org && (
          <>
            <span className="pill">{p.org}</span>›
          </>
        )}
        <span className="pill" aria-current="page">
          {p.name}
        </span>
      </div>
      <h1 className="page" style={{ marginTop: 16 }}>
        {p.name}
      </h1>
      <div className="chips">
        <StatusChip status="DEVELOPMENT" />
        <StatusChip status="RECORDED" />
        <StatusChip status={p.source.status} />
        {p.repoState === "INFERRED" && (
          <StatusChip status="INFERRED" label="Repository inferred from URL" />
        )}
        {!p.repoUrl && <StatusChip status="UNKNOWN" label="Repository not verified" />}
      </div>

      <nav className="tabs" aria-label="Project sections">
        {TABS.map((t) => (
          <a key={t} href={`#${t}`}>
            {t[0]!.toUpperCase() + t.slice(1)}
          </a>
        ))}
      </nav>

      <div className="grid g2">
        <div className="grid">
          <section className="card" id="overview" aria-labelledby="ov">
            <h2 id="ov" style={{ fontSize: 20 }}>
              Overview
            </h2>
            <dl className="kv">
              <dt>Project</dt>
              <dd>{p.name}</dd>
              <dt>{mentorship ? "Upstream project" : "Organization"}</dt>
              <dd>{p.org ?? p.name}</dd>
              <dt>Program</dt>
              <dd>
                <Link href={`/programs/${p.program.slug}`}>{p.program.name}</Link>
                {p.ecosystem ? ` (${p.ecosystem} ecosystem only)` : ""}
              </dd>
              {detail.maturity && (
                <>
                  <dt>Maturity</dt>
                  <dd>
                    {detail.maturity} <span className="hint">(as stated by CNCF)</span>
                  </dd>
                </>
              )}
              {detail.license && (
                <>
                  <dt>Licence</dt>
                  <dd>{detail.license}</dd>
                </>
              )}
              <dt>Status</dt>
              <dd>
                {mentorship
                  ? "Listed for the terms below (recorded)"
                  : "Participated in the years below (recorded)"}
              </dd>
            </dl>
            {p.summary ? (
              <p style={{ margin: "12px 0 0" }}>{p.summary}</p>
            ) : (
              <p className="muted">No description recorded.</p>
            )}
            <p className="hint">
              Descriptions are short excerpts of the source text (summarized); see the source for
              the full text.
            </p>
            <SourceBadge source={p.source} />
          </section>

          <section className="card" id="history" aria-labelledby="hi">
            <h2 id="hi" style={{ fontSize: 20 }}>
              Program history
            </h2>
            {mentorship ? (
              <>
                <p className="muted" style={{ margin: "4px 0 12px" }}>
                  Project-level terms. Term status is derived from dates, and the source&apos;s own
                  spelling is kept.
                </p>
                {detail.terms.length === 0 ? (
                  <p className="muted">No terms recorded.</p>
                ) : (
                  <>
                    <TermRibbon
                      caption="Terms this project appears in"
                      columns={["Term"]}
                      rows={detail.terms.map((t) => ({
                        label: (
                          <>
                            {p.program.name}
                            <br />
                            <span
                              className="muted"
                              style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
                            >
                              Project level
                            </span>
                          </>
                        ),
                        cells: [
                          {
                            key: t.rawName,
                            content: t.normalized ?? "?",
                            cls:
                              t.status === "CONFIRMED"
                                ? "c-ok"
                                : t.status === "CONFLICTING"
                                  ? "c-conf"
                                  : "c-inf",
                            title: t.reason,
                          },
                        ],
                      }))}
                    />
                    <div className="scroll" style={{ marginTop: 16 }}>
                      <table className="stack">
                        <thead>
                          <tr>
                            <th scope="col">Source spelling</th>
                            <th scope="col">Canonical term</th>
                            <th scope="col">Dates</th>
                            <th scope="col">Normalization</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.terms.map((t) => (
                            <tr key={t.rawName}>
                              <th scope="row">{t.rawName}</th>
                              <td data-label="Canonical term">{t.normalized ?? "unmapped"}</td>
                              <td data-label="Dates">
                                {t.start ?? "?"} → {t.end ?? "?"}
                              </td>
                              <td data-label="Normalization">
                                <StatusChip status={t.status} />{" "}
                                <span className="hint">{t.reason}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <Notice kind="info" testId="granularity-note">
                  <strong>Organization participated</strong> in these years. Project-level GSoC
                  participation: <strong>not verified</strong>.
                </Notice>
                <div className="chips" style={{ marginTop: 12 }}>
                  {detail.history.map((h) => (
                    <span
                      key={h.year}
                      className="chip c-hist"
                      title="Recorded organization participation"
                    >
                      <span aria-hidden="true">◷</span>GSoC {h.year} · {h.status.toLowerCase()}
                    </span>
                  ))}
                </div>
              </>
            )}
            {detail.conflicts.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Notice kind="warn">
                  <strong>Sources disagree.</strong>{" "}
                  {detail.conflicts.map((c) => c.detail).join(" ")}
                </Notice>
              </div>
            )}
          </section>

          <section className="card" id="technologies" aria-labelledby="te">
            <h2 id="te" style={{ fontSize: 20 }}>
              Technologies
            </h2>
            {p.technologies.length === 0 && p.topics.length === 0 ? (
              <p className="muted">Not recorded.</p>
            ) : (
              <>
                {p.technologies.length > 0 && (
                  <div className="chips" style={{ marginTop: 8 }}>
                    {p.technologies.map((t) => (
                      <span className="tag" key={t}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {p.topics.length > 0 && (
                  <>
                    <p className="muted" style={{ margin: "12px 0 6px" }}>
                      Topics
                    </p>
                    <div className="chips">
                      {p.topics.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <p className="hint">
              Languages and technologies as listed by the source, not detected from code.
            </p>
          </section>

          <section className="card" id="repository" aria-labelledby="re">
            <h2 id="re" style={{ fontSize: 20 }}>
              Repository
            </h2>
            {p.repoUrl ? (
              <dl className="kv">
                <dt>URL</dt>
                <dd>
                  <a href={p.repoUrl} target="_blank" rel="noreferrer noopener">
                    {p.repoUrl}
                  </a>
                </dd>
                <dt>Link state</dt>
                <dd>
                  <StatusChip status={p.repoState === "INFERRED" ? "INFERRED" : "RECORDED"} />{" "}
                  <span className="hint">
                    canonical URL from the recorded link; GitHub id not yet verified
                  </span>
                </dd>
              </dl>
            ) : (
              <p className="muted">Repository not verified.</p>
            )}
            <div style={{ marginTop: 12 }}>
              <Notice kind="dev">
                Repository facts (languages, contributors, commits, issues, pull requests) require
                live GitHub analysis, which is{" "}
                <strong>not enabled in this development build</strong>.{" "}
                <Link href="/repositories/analyze">Analyze a repository</Link>
              </Notice>
            </div>
          </section>

          <section className="card" id="mentors" aria-labelledby="me">
            <h2 id="me" style={{ fontSize: 20 }}>
              Mentors
            </h2>
            {detail.mentors.length === 0 ? (
              <p className="muted" data-testid="no-mentors">
                Mentor not verified.{" "}
                {mentorship ? "" : "GSoC mentor history is not available from the recorded source."}
              </p>
            ) : (
              <ul className="crit" data-testid="mentor-list">
                {detail.mentors.map((m) => (
                  <li key={m.githubLogin}>
                    <span>
                      {m.name}{" "}
                      <a
                        href={`https://github.com/${m.githubLogin}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mono"
                      >
                        @{m.githubLogin}
                      </a>{" "}
                      {m.roleLabel && <span className="tag">{m.roleLabel}</span>}{" "}
                      <StatusChip status={m.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="hint">
              Only name, public GitHub handle and role from the CNCF repository. Contact details are
              never stored or shown.
            </p>
          </section>

          <section className="card" id="contribution" aria-labelledby="co">
            <h2 id="co" style={{ fontSize: 20 }}>
              Contribution
            </h2>
            {mentorship && p.repoUrl ? (
              <p style={{ margin: "8px 0" }}>
                Start from the project&apos;s own repository:{" "}
                <a href={p.repoUrl} target="_blank" rel="noreferrer noopener">
                  {p.repoUrl}
                </a>
                .
              </p>
            ) : (
              <p className="muted">No contribution links recorded.</p>
            )}
            <Notice kind="dev">
              Contribution guidance (setup, labels, first issues) needs repository analysis and is{" "}
              <strong>not available in this development build</strong>.
            </Notice>
            <div className="actions">
              <Link className="btn sm" href={`/interview?project=${p.id}`}>
                Practice explaining this project
              </Link>
            </div>
          </section>
        </div>

        <aside className="grid" aria-label="Sources and status">
          <div className="card">
            <h3>Why this is shown</h3>
            <ul className="crit">
              <li>
                <span className="c-ok" aria-hidden="true">
                  ✓
                </span>
                <span>
                  Listed in {p.program.name}
                  {p.terms.length ? `: ${p.terms.slice(0, 3).join(", ")}` : ""} (recorded)
                </span>
              </li>
              <li>
                <span className="c-unk" aria-hidden="true">
                  ?
                </span>
                <span>Recent activity: could not be verified</span>
              </li>
              <li>
                <span className="c-unk" aria-hidden="true">
                  ?
                </span>
                <span>Language match: not verified until the repository is analyzed</span>
              </li>
            </ul>
            <p className="hint">Criteria only. There is no match score.</p>
          </div>
          <div className="card">
            <h3>Status legend</h3>
            <div className="chips" style={{ marginTop: 10 }}>
              {(
                [
                  "CONFIRMED",
                  "HISTORICAL",
                  "RECORDED",
                  "INFERRED",
                  "UNKNOWN",
                  "DEVELOPMENT",
                ] as const
              ).map((k) => (
                <StatusChip key={k} status={k} />
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section id="sources" style={{ marginTop: 32 }} aria-labelledby="so">
        <h2 id="so">Sources</h2>
        <p className="sub">Everything on this page comes from these recorded snapshots.</p>
        <SourcePanel sources={sources} />
      </section>
    </div>
  );
}
