import Link from "next/link";
import type { Metadata } from "next";
import { listProjects } from "@opensourcex/database";
import { load } from "@/lib/data";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { ProjectCard, type Why } from "@/features/discovery/ProjectCard";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function Discover({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const f = { q: one(sp.q), program: one(sp.program), tech: one(sp.tech), topic: one(sp.topic) };
  const res = await load((d) => listProjects(d, f));
  const active = Object.values(f).some(Boolean);

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Discover</div>
      <h1 className="page">Find a project, and see why it matches</h1>
      <p className="sub">
        Filters use only fields present in the recorded data. Matching is shown as criteria, never
        as a score.
      </p>

      {!res.ok ? (
        <DbDown />
      ) : (
        <>
          <form
            className="card filters"
            method="get"
            data-testid="filters"
            aria-label="Filter projects"
          >
            <div className="field">
              <label htmlFor="q">Search</label>
              <input
                id="q"
                type="search"
                name="q"
                defaultValue={f.q}
                placeholder="name, technology, topic"
              />
            </div>
            <div className="field">
              <label htmlFor="program">Program</label>
              <select id="program" name="program" defaultValue={f.program}>
                <option value="">All programs</option>
                {res.data.facets.programs.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tech">Technology / language</label>
              <select id="tech" name="tech" defaultValue={f.tech}>
                <option value="">Any</option>
                {res.data.facets.technologies.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.n})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="topic">Interest (topic)</label>
              <select id="topic" name="topic" defaultValue={f.topic}>
                <option value="">Any</option>
                {res.data.facets.topics.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.value} ({t.n})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="experience">Experience</label>
              <select id="experience" name="experience" disabled aria-describedby="exp-hint">
                <option>Not in recorded data</option>
              </select>
              <span id="exp-hint" className="hint">
                Experience level is not available in the sources yet.
              </span>
            </div>
            <div className="chips" style={{ gridColumn: "1 / -1" }}>
              <button className="btn primary sm" type="submit">
                Apply filters
              </button>
              {active && (
                <Link className="btn sm" href="/discover">
                  Clear
                </Link>
              )}
              <span className="muted" data-testid="result-count">
                {res.data.items.length} of {res.data.total} recorded projects
              </span>
            </div>
          </form>

          <div style={{ marginTop: 16 }}>
            <Notice kind="dev">
              <strong>Development data.</strong> Results come from a small recorded sample of GSoC
              organizations (organization/year level) and CNCF-listed LFX mentorship projects.
              Ordering: A to Z. Activity is not connected yet.
            </Notice>
          </div>

          <div style={{ marginTop: 16 }}>
            {res.data.items.length === 0 ? (
              <EmptyState
                title="No recorded project matches"
                action={
                  <Link className="btn" href="/discover">
                    Clear filters
                  </Link>
                }
              >
                This does not mean none exists: the development build only holds a small recorded
                sample.
              </EmptyState>
            ) : (
              <div className="grid g2e" data-testid="results">
                {res.data.items.map((p) => {
                  const why: Why[] = [];
                  if (f.program) why.push({ ok: true, text: `Program: ${p.program.name}` });
                  if (f.tech)
                    why.push({
                      ok: true,
                      text: `Technology "${f.tech}" appears in the recorded tags`,
                    });
                  if (f.topic)
                    why.push({ ok: true, text: `Topic "${f.topic}" appears in the recorded tags` });
                  if (f.q)
                    why.push({
                      ok: true,
                      text: `Text "${f.q}" found in the recorded name, summary or tags`,
                    });
                  why.push({
                    ok: p.terms.length > 0,
                    text: p.terms.length
                      ? `Listed in ${p.program.name}: ${p.terms.slice(0, 3).join(", ")} (recorded)`
                      : "Program participation: not verified",
                  });
                  why.push({
                    ok: null,
                    text: "Recent repository activity: could not be verified (not connected)",
                  });
                  return <ProjectCard key={p.id} p={p} why={why} />;
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
