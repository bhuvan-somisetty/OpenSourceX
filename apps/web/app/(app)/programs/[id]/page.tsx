import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgram, listProjects } from "@opensourcex/database";
import { derivedTermStatus } from "@opensourcex/entity-resolution";
import { load } from "@/lib/data";
import { currentSaved, isSaved } from "@/lib/saved";
import { resolveProgram } from "@/lib/programs";
import { first, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { SourceBadge } from "@/components/source/SourceBadge";
import { TermRibbon } from "@/components/data-display/TermRibbon";
import { ProgramMark } from "@/components/ui/ProgramMark";
import { ProjectRow } from "@/features/projects/ProjectRow";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program" };

const TABS = [
  ["projects", "Projects"],
  ["technologies", "Technologies"],
  ["history", "History"],
] as const;

export default async function ProgramDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Params>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const def = resolveProgram(id);
  if (!def) notFound();
  const tab = TABS.some((t) => t[0] === first(sp.tab)) ? first(sp.tab) : "projects";
  const q = first(sp.q),
    tech = first(sp.tech);
  const res = await load(async (d) => ({
    prog: await getProgram(d, def.slug),
    items: await listProjects(d, { program: def.slug, q, tech }),
    all: await listProjects(d, { program: def.slug }),
  }));
  const saved = await currentSaved();
  if (!res.ok)
    return (
      <div className="wrap">
        <DbDown />
      </div>
    );
  if (!res.data.prog) {
    return (
      <div className="wrap">
        <section className="page-hero">
          <ProgramMark slug={def.slug} />
          <h1 className="page" style={{ marginTop: 18 }}>
            {def.name}
          </h1>
        </section>
        <EmptyState
          title="No data for this program yet"
          action={
            <Link className="btn" href="/programs">
              Choose another program
            </Link>
          }
        >
          {def.name} is configured in OpenSourceX but has no recorded data in this build.
        </EmptyState>
      </div>
    );
  }
  const { prog, items, all } = res.data;
  const s = prog.summary;
  const cur: Params = { q, tech, tab };
  const latest =
    prog.kind === "gsoc"
      ? String(prog.years[prog.years.length - 1]?.year ?? "")
      : prog.terms[prog.terms.length - 1]
        ? `${prog.terms[prog.terms.length - 1]!.year} ${prog.terms[prog.terms.length - 1]!.code}`
        : "";

  return (
    <div className="wrap">
      <section className="page-hero" data-testid="program-hero">
        <div className="spine">
          <Link href="/programs">Programs</Link>›
          <span className="pill" aria-current="page">
            {def.short}
          </span>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 20 }}>
          <ProgramMark slug={def.slug} />
          <div className="eyebrow">{latest ? `${latest} · recorded` : "Program"}</div>
        </div>
        <h1 className="page" style={{ marginTop: 14 }}>
          {def.name}
        </h1>
        <p className="sub">
          {prog.kind === "gsoc"
            ? "Explore organizations participating in GSoC."
            : "Explore mentorship projects and terms."}
        </p>
      </section>

      <div style={{ display: "grid", gap: 12 }}>
        {prog.kind === "gsoc" ? (
          <Notice kind="info" testId="granularity-note">
            <strong>Organization and year.</strong> The recorded source says an{" "}
            <em>organization</em> participated in a year. Project-level participation and mentor
            history are <strong>not verified</strong> and never inferred.
          </Notice>
        ) : (
          <Notice kind="info" testId="ecosystem-note">
            <strong>CNCF ecosystem only.</strong> This shows CNCF-listed LFX Mentorship projects. It
            is <strong>not the whole LFX Mentorship</strong> program.
          </Notice>
        )}
      </div>

      <div className="scroll-x" style={{ marginTop: 28 }}>
        <div
          className="segmented"
          role="group"
          aria-label="Program sections"
          data-testid="program-tabs"
        >
          {TABS.map(([k, l]) => (
            <Link
              key={k}
              href={withParams(`/programs/${def.alias}`, cur, { tab: k })}
              aria-current={tab === k ? "true" : undefined}
            >
              {k === "projects" ? (prog.kind === "gsoc" ? "Organizations" : "Projects") : l}
            </Link>
          ))}
        </div>
      </div>

      {tab === "projects" && (
        <section className="block" style={{ marginTop: 28 }} aria-label="Projects">
          <form
            className="toolbar"
            method="get"
            style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto", alignItems: "end" }}
          >
            <input type="hidden" name="tab" value="projects" />
            <div className="field">
              <label htmlFor="pq">Search</label>
              <input
                id="pq"
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name, technology or topic"
              />
            </div>
            <div className="field">
              <label htmlFor="pt">Technology</label>
              <select id="pt" name="tech" defaultValue={tech}>
                <option value="">Any</option>
                {all.facets.technologies.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.n})
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primary sm" type="submit">
              Apply
            </button>
          </form>
          <p className="muted" style={{ margin: "18px 0 8px" }} data-testid="result-count">
            {items.items.length} of {all.items.length}
          </p>
          {items.items.length === 0 ? (
            <EmptyState
              title="Nothing matches"
              action={
                <Link className="btn" href={`/programs/${def.alias}`}>
                  Clear filters
                </Link>
              }
            >
              No recorded entry matches these filters.
            </EmptyState>
          ) : (
            <div data-testid="results">
              {items.items.map((p) => (
                <ProjectRow key={p.id} p={p} saved={isSaved(saved, p)} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "technologies" && (
        <section className="block" style={{ marginTop: 28 }} aria-label="Technologies">
          {all.facets.technologies.length === 0 ? (
            <p className="muted">No technologies recorded.</p>
          ) : (
            <div className="chips" style={{ gap: 10 }} data-testid="tech-list">
              {all.facets.technologies.map((t) => (
                <Link
                  key={t.value}
                  className="interest"
                  href={`/projects?program=${def.alias}&tech=${encodeURIComponent(t.value)}`}
                >
                  {t.value} <span className="dim">{t.n}</span>
                </Link>
              ))}
            </div>
          )}
          <p className="hint" style={{ marginTop: 14 }}>
            As listed by the source, not detected from code.
          </p>
        </section>
      )}

      {tab === "history" && (
        <section className="block" style={{ marginTop: 28 }} aria-label="History">
          {prog.kind === "gsoc" ? (
            <TermRibbon
              caption="Organization participation by year (organization level)"
              columns={prog.years.map((y) => String(y.year))}
              rows={[
                {
                  label: (
                    <>
                      {def.short}
                      <br />
                      <span
                        className="dim"
                        style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
                      >
                        Organization level only
                      </span>
                    </>
                  ),
                  cells: prog.years.map((y) => ({
                    key: String(y.year),
                    content: y.orgs.length,
                    cls: "c-hist",
                    title: `${y.orgs.length} recorded organizations in ${y.year}`,
                  })),
                },
              ]}
            />
          ) : prog.terms.length === 0 ? (
            <p className="muted">No canonical terms recorded.</p>
          ) : (
            <>
              <TermRibbon
                caption="Recorded projects per canonical term (project level)"
                columns={prog.terms.map((t) => `${t.year} ${t.code}`)}
                rows={[
                  {
                    label: (
                      <>
                        {def.short}, CNCF only
                        <br />
                        <span
                          className="dim"
                          style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}
                        >
                          Project level
                        </span>
                      </>
                    ),
                    cells: prog.terms.map((t) => ({
                      key: `${t.year}${t.code}${t.track}`,
                      content: t.projects.length,
                      cls: "c-hist",
                      title: `${t.projects.length} recorded projects`,
                    })),
                  },
                ]}
              />
              {prog.terms.map((t) => (
                <p
                  key={`${t.year}${t.code}${t.track}`}
                  className="muted"
                  style={{ marginTop: 16 }}
                  data-testid="term-block"
                >
                  <strong style={{ color: "var(--text)" }}>
                    {t.year} {t.code}
                  </strong>{" "}
                  · {t.startsOn ?? "?"} to {t.endsOn ?? "?"} · status from dates:{" "}
                  {derivedTermStatus({ startsOn: t.startsOn, endsOn: t.endsOn }).replace("_", " ")}
                  {t.rawNames.map((r) => (
                    <span className="tag" key={r} style={{ marginLeft: 6 }}>
                      {r}
                    </span>
                  ))}
                </p>
              ))}
            </>
          )}
        </section>
      )}

      <section className="block" aria-labelledby="src-h">
        <h2 id="src-h" style={{ fontSize: 20 }}>
          Sources
        </h2>
        {s.sources.map((x) => (
          <SourceBadge key={x.provenanceId} source={x} />
        ))}
        <p className="hint" style={{ marginTop: 10 }}>
          Official program page:{" "}
          <a href={s.officialUrl} target="_blank" rel="noreferrer noopener">
            {s.officialUrl}
          </a>{" "}
          · <Link href="/sources">All sources and status</Link>
        </p>
      </section>
    </div>
  );
}
