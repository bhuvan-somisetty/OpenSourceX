import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms, listProjects } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved, isSaved } from "@/lib/saved";
import { PROGRAM_CATALOG, resolveProgram } from "@/lib/programs";
import { first, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState } from "@/components/feedback/Notice";
import { ProjectRow } from "@/features/projects/ProjectRow";

export const metadata: Metadata = { title: "Project catalog" };
export const dynamic = "force-dynamic";

/** The catalog: every recorded project, searchable, filterable, sortable. (Discover is the intent-driven entry point.) */
export default async function Projects({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const prog = resolveProgram(first(sp.program));
  const q = first(sp.q),
    tech = first(sp.tech),
    term = first(sp.term),
    sort = first(sp.sort) || "az";
  const res = await load(async (d) => ({
    all: await listProjects(d),
    filtered: await listProjects(d, { q, program: prog?.slug, tech }),
    programs: await listPrograms(d),
  }));
  const saved = await currentSaved();
  const cur: Params = { q, program: prog?.alias ?? "", tech, term, sort };

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Projects</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Project catalog
        </h1>
        <p className="sub">
          Every project and organization in the recorded dataset. Search, filter and sort. Looking
          for ideas instead? Try <Link href="/discover">Discover</Link>.
        </p>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        (() => {
          const have = new Set(
            res.data.programs
              .filter((p) => p.organizations + p.mentorshipProjects > 0)
              .map((p) => p.slug),
          );
          const terms = [...new Set(res.data.all.items.flatMap((p) => p.terms))].sort();
          let items = res.data.filtered.items.filter((p) => !term || p.terms.includes(term));
          items = [...items].sort((a, b) =>
            sort === "program"
              ? a.program.name.localeCompare(b.program.name) || a.name.localeCompare(b.name)
              : sort === "za"
                ? b.name.localeCompare(a.name)
                : a.name.localeCompare(b.name),
          );
          return (
            <>
              <div className="scroll-x" data-testid="program-filter">
                <div className="segmented" role="group" aria-label="Program">
                  <Link
                    href={withParams("/projects", cur, { program: null })}
                    aria-current={!prog ? "true" : undefined}
                  >
                    All programs
                  </Link>
                  {PROGRAM_CATALOG.filter((d) => have.has(d.slug)).map((d) => (
                    <Link
                      key={d.slug}
                      href={withParams("/projects", cur, { program: d.alias })}
                      aria-current={prog?.slug === d.slug ? "true" : undefined}
                      data-testid={`filter-${d.alias}`}
                    >
                      {d.short}
                    </Link>
                  ))}
                </div>
              </div>

              <form
                className="toolbar cols block"
                style={{ marginTop: 24 }}
                method="get"
                aria-label="Filter projects"
                data-testid="filters"
              >
                {prog && <input type="hidden" name="program" value={prog.alias} />}
                <div className="field">
                  <label htmlFor="q">Search</label>
                  <input
                    id="q"
                    type="search"
                    name="q"
                    defaultValue={q}
                    placeholder="Name, technology or topic"
                  />
                </div>
                <div className="field">
                  <label htmlFor="tech">Technology</label>
                  <select id="tech" name="tech" defaultValue={tech}>
                    <option value="">Any</option>
                    {res.data.all.facets.technologies.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.value} ({t.n})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="term">Year / term</label>
                  <select id="term" name="term" defaultValue={term}>
                    <option value="">Any</option>
                    {terms.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="sort">Sort</label>
                  <select id="sort" name="sort" defaultValue={sort}>
                    <option value="az">Name A to Z</option>
                    <option value="za">Name Z to A</option>
                    <option value="program">Program</option>
                  </select>
                </div>
                <div className="chips">
                  <button className="btn primary sm" type="submit">
                    Apply
                  </button>
                  {(q || tech || term || prog) && (
                    <Link className="btn sm" href="/projects">
                      Clear
                    </Link>
                  )}
                </div>
              </form>

              <p className="muted" style={{ margin: "20px 0 8px" }} data-testid="result-count">
                {items.length} of {res.data.all.total} projects{prog ? ` in ${prog.name}` : ""}
              </p>

              {items.length === 0 ? (
                <EmptyState
                  title="No projects match these filters"
                  action={
                    <Link className="btn" href="/projects">
                      Clear filters
                    </Link>
                  }
                >
                  This does not mean none exist: the development build holds a small recorded
                  sample.
                </EmptyState>
              ) : (
                <div data-testid="results">
                  {items.map((p) => (
                    <ProjectRow key={p.id} p={p} saved={isSaved(saved, p)} />
                  ))}
                </div>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
