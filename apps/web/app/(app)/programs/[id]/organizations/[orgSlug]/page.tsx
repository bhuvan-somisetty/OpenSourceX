import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLfxOrganization, type LfxOrgProject } from "@opensourcex/database";
import { load } from "@/lib/data";
import { resolveProgram } from "@/lib/programs";
import { currentSaved, isSaved } from "@/lib/saved";
import { first, type Params } from "@/lib/url";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { SourceBadge } from "@/components/source/SourceBadge";
import { StatusChip } from "@/components/status/StatusChip";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { SaveButton } from "@/features/saved/SaveButton";
import { LfxProjectCard } from "@/features/lfx/LfxProjectCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const decoded = decodeURIComponent(orgSlug);
  return {
    title: `${decoded.charAt(0).toUpperCase() + decoded.slice(1)} · LFX Mentorship`,
  };
}

export default async function LfxOrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; orgSlug: string }>;
  searchParams: Promise<Params>;
}) {
  const { id, orgSlug } = await params;
  const sp = await searchParams;
  const def = resolveProgram(id);
  if (!def) notFound();

  const q = first(sp.q)?.trim().toLowerCase();
  const tech = first(sp.tech)?.trim().toLowerCase();
  const yearParam = first(sp.year)?.trim();
  const termParam = first(sp.term)?.trim().toUpperCase();

  const res = await load((d) => getLfxOrganization(d, orgSlug));
  const savedSet = await currentSaved();

  if (!res.ok) {
    return (
      <div className="wrap">
        <DbDown />
      </div>
    );
  }

  const org = res.data;
  if (!org) notFound();

  // Apply filters to timeline
  let filteredProjects = org.allProjects;
  if (q || tech || yearParam || termParam) {
    filteredProjects = filteredProjects.filter((p: LfxOrgProject) => {
      if (yearParam && p.year !== Number(yearParam)) return false;
      if (termParam && p.termCode !== termParam) return false;
      if (tech && !p.technologies.some((t) => t.toLowerCase() === tech)) return false;
      if (q) {
        const titleMatch = p.title.toLowerCase().includes(q);
        const summaryMatch = p.summary ? p.summary.toLowerCase().includes(q) : false;
        const techMatch = p.technologies.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !summaryMatch && !techMatch) return false;
      }
      return true;
    });
  }

  // Group filtered projects back into Year -> Term structure (NEWEST FIRST)
  const filteredProjectIds = new Set(filteredProjects.map((p) => p.rawId));
  const filteredTimeline = org.timeline
    .map((yg) => {
      const filteredTerms = yg.terms
        .map((tg) => ({
          ...tg,
          projects: tg.projects.filter((p) => filteredProjectIds.has(p.rawId)),
        }))
        .filter((tg) => tg.projects.length > 0);

      return {
        ...yg,
        terms: filteredTerms,
      };
    })
    .filter((yg) => yg.terms.length > 0);

  const hasFilter = Boolean(q || tech || yearParam || termParam);
  const basePath = `/programs/${def.slug}/organizations/${org.slug}`;

  const yearRange =
    org.years.length > 1
      ? `${org.years[org.years.length - 1]}–${org.years[0]}`
      : org.years.length === 1
        ? `${org.years[0]}`
        : "Recorded";

  return (
    <div className="wrap">
      {/* Breadcrumb Spine */}
      <section className="page-hero" data-testid="org-hero">
        <div className="spine" aria-label="Program navigation">
          <Link href="/programs">Programs</Link>›
          <Link href={`/programs/${def.slug}`}>{def.short}</Link>›
          <span className="pill" aria-current="page">
            {org.name}
          </span>
        </div>

        <div className="lfx-org-hero-content" style={{ marginTop: 24 }}>
          <div className="lfx-org-hero-top">
            <OrgLogo slug={org.slug} name={org.name} size={72} />
            <div>
              <div className="eyebrow">Organization · CNCF Ecosystem</div>
              <h1 className="page" style={{ marginTop: 6, fontSize: "clamp(26px, 4vw, 36px)" }}>
                {org.name}
              </h1>
            </div>
          </div>

          {org.description && (
            <p className="sub" style={{ marginTop: 14, maxWidth: "70ch" }}>
              {org.description}
            </p>
          )}

          <div className="chips" style={{ marginTop: 16 }}>
            <StatusChip status="RECORDED" label="CNCF Recorded Data" />
            <span className="pill">
              <strong>{org.projectCount}</strong> recorded project{org.projectCount === 1 ? "" : "s"}
            </span>
            <span className="pill">
              <strong>{org.yearCount}</strong> participation year{org.yearCount === 1 ? "" : "s"} ({yearRange})
            </span>
            {org.latestTerm && (
              <span className="pill">
                Latest term: <strong>{org.latestTerm}</strong>
              </span>
            )}
          </div>

          <div className="actions" style={{ marginTop: 20 }}>
            <SaveButton
              entityType="ORGANIZATION"
              entityId={`org-lfx-${org.slug}`}
              initialSaved={savedSet.has(`ORGANIZATION:org-lfx-${org.slug}`)}
              label={org.name}
            />
            {org.sampleRepoUrl && (
              <a
                className="btn"
                href={org.sampleRepoUrl}
                target="_blank"
                rel="noreferrer noopener"
                data-testid="open-org-repo"
              >
                Open repository ↗
              </a>
            )}
            <Link className="btn" href={`/programs/${def.slug}`}>
              ← Back to Organizations
            </Link>
          </div>
        </div>
      </section>

      {/* Scope and Provenance Notice */}
      <div style={{ marginTop: 20 }}>
        <Notice kind="info">
          <strong>CNCF Mentorship History.</strong> Displaying recorded mentorship projects for{" "}
          <strong>{org.name}</strong> from the CNCF mentoring repository. Terms and years are
          ordered newest first.
        </Notice>
      </div>

      {/* In-Organization Project Filters */}
      <section className="block" style={{ marginTop: 28 }} aria-label="Filter Projects">
        <form className="toolbar lfx-toolbar" method="get">
          <div className="field">
            <label htmlFor="p-search">Search projects</label>
            <input
              id="p-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search title, description, or technology..."
            />
          </div>

          <div className="field">
            <label htmlFor="p-tech">Technology</label>
            <select id="p-tech" name="tech" defaultValue={tech}>
              <option value="">All technologies</option>
              {org.technologies.map((t) => (
                <option key={t} value={t.toLowerCase()}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ minWidth: 120 }}>
            <label htmlFor="p-year">Year</label>
            <select id="p-year" name="year" defaultValue={yearParam}>
              <option value="">All years</option>
              {org.years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ minWidth: 110 }}>
            <label htmlFor="p-term">Term</label>
            <select id="p-term" name="term" defaultValue={termParam}>
              <option value="">All terms</option>
              <option value="T3">Term 3 (Sep–Nov)</option>
              <option value="T2">Term 2 (Jun–Aug)</option>
              <option value="T1">Term 1 (Mar–May)</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button className="btn primary sm" type="submit">
              Filter
            </button>
            {hasFilter && (
              <Link href={basePath} className="btn sm">
                Reset
              </Link>
            )}
          </div>
        </form>

        <div className="lfx-count-row" style={{ marginTop: 14 }}>
          <p className="muted" data-testid="project-filter-count">
            Showing <strong>{filteredProjects.length}</strong> of {org.allProjects.length} recorded projects
            {hasFilter && " (filtered)"}
          </p>
        </div>

        {/* Chronological Timeline: Years (Newest First) -> Terms (Newest First) -> Projects */}
        {filteredTimeline.length === 0 ? (
          <EmptyState
            title="No matching projects found"
            action={
              <Link className="btn" href={basePath}>
                Reset filters
              </Link>
            }
          >
            No recorded mentorship projects for {org.name} match the active filters.
          </EmptyState>
        ) : (
          <div className="lfx-timeline" data-testid="org-timeline">
            {filteredTimeline.map((yg) => {
              const yearTitle = yg.year > 0 ? `${yg.year}` : "Earlier Records";
              const totalYearProjects = yg.terms.reduce((acc, t) => acc + t.projects.length, 0);

              return (
                <div key={yg.year} className="lfx-year-block" data-testid={`year-section-${yg.year}`}>
                  <div className="lfx-year-header">
                    <div className="lfx-year-heading-wrap">
                      <h2 className="lfx-year-title">{yearTitle}</h2>
                      <span className="tag lfx-year-count-tag">
                        {totalYearProjects} project{totalYearProjects === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  <div className="lfx-terms-wrap">
                    {yg.terms.map((tg) => (
                      <div
                        key={tg.termCode}
                        className="lfx-term-block"
                        data-testid={`term-section-${yg.year}-${tg.termCode}`}
                      >
                        <div className="lfx-term-header">
                          <div className="lfx-term-title-wrap">
                            <span className="lfx-term-pill">{tg.termBadge}</span>
                            <h3 className="lfx-term-title">{tg.termLabel}</h3>
                          </div>
                          {tg.startsOn && tg.endsOn && (
                            <span className="dim lfx-term-dates">
                              {tg.startsOn} to {tg.endsOn}
                            </span>
                          )}
                        </div>

                        <div className="lfx-project-grid">
                          {tg.projects.map((project) => (
                            <LfxProjectCard
                              key={project.id}
                              project={project}
                              saved={isSaved(savedSet, { id: project.id, kind: "mentorship" })}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Sources & Trust Section */}
      <section className="block" style={{ marginTop: 40 }} aria-labelledby="sources-heading">
        <h2 id="sources-heading" style={{ fontSize: 20 }}>
          Sources and Provenance
        </h2>
        <div style={{ marginTop: 12 }}>
          {org.sources.map((s) => (
            <SourceBadge key={s.provenanceId} source={s} />
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Source repository:{" "}
          <a
            href="https://github.com/cncf/mentoring/tree/main/programs/lfx-mentorship"
            target="_blank"
            rel="noreferrer noopener"
          >
            github.com/cncf/mentoring/programs/lfx-mentorship ↗
          </a>{" "}
          · <Link href="/sources">All sources and status</Link>
        </p>
      </section>
    </div>
  );
}
