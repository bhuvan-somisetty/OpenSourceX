import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms, listProjects, type ProjectCard as Card } from "@opensourcex/database";
import { load } from "@/lib/data";
import { currentSaved, isSaved } from "@/lib/saved";
import { PROGRAM_CATALOG, resolveProgram } from "@/lib/programs";
import { first, many, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState, Notice } from "@/components/feedback/Notice";
import { ProjectCard, type Why } from "@/features/discovery/ProjectCard";

export const metadata: Metadata = { title: "Discover" };
export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase();

/** Discover: intent -> filter -> explanation -> exploration. (The Projects page is the plain catalog.) */
export default async function Discover({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const interests = many(sp.i).slice(0, 8);
  const prog = resolveProgram(first(sp.program));
  const res = await load(async (d) => ({
    all: await listProjects(d),
    programs: await listPrograms(d),
  }));
  const saved = await currentSaved();
  const cur: Params = { i: interests, program: prog?.alias ?? "" };

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Discover</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you interested in?
        </h1>
        <p className="sub">
          Pick what you care about. We will show which recorded projects fit, and exactly why. No
          scores, just reasons.
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
          const facets = [
            ...res.data.all.facets.technologies.slice(0, 12).map((t) => t.value),
            ...res.data.all.facets.topics
              .filter((t) => !res.data.all.facets.technologies.some((x) => x.value === t.value))
              .slice(0, 4)
              .map((t) => t.value),
          ];
          const pool = res.data.all.items.filter((p) => !prog || p.program.slug === prog.slug);
          const matched = interests.length
            ? pool
                .map((p) => ({
                  p,
                  hits: interests.filter((i) =>
                    [...p.technologies, ...p.topics].some((t) => norm(t) === norm(i)),
                  ),
                }))
                .filter((m) => m.hits.length > 0)
                .sort((a, b) => b.hits.length - a.hits.length || a.p.name.localeCompare(b.p.name))
            : [];
          const why = (p: Card, hits: string[]): Why[] => [
            ...hits.map((h) => ({
              ok: true,
              text: `Matches "${h}" in its recorded technologies or topics`,
            })),
            {
              ok: p.terms.length > 0,
              text: p.terms.length
                ? `${p.program.name} participation: ${p.terms.slice(0, 2).join(", ")} (recorded)`
                : "Program participation: not verified",
            },
            {
              ok: !!p.repoUrl,
              text: p.repoUrl ? "Repository available" : "Repository: not verified",
            },
            { ok: null, text: "Recent activity: could not be verified (not connected)" },
          ];

          return (
            <>
              <section aria-labelledby="int-h">
                <h2 id="int-h" style={{ fontSize: 18 }} className="muted">
                  Your interests
                </h2>
                <div className="chips" style={{ marginTop: 14, gap: 10 }} data-testid="interests">
                  {facets.map((f) => {
                    const on = interests.some((i) => norm(i) === norm(f));
                    const next = on
                      ? interests.filter((i) => norm(i) !== norm(f))
                      : [...interests, f];
                    return (
                      <Link
                        key={f}
                        className="interest"
                        href={withParams("/discover", cur, { i: next })}
                        aria-pressed={on}
                      >
                        {f}
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="block" aria-label="Program and experience">
                <div style={{ display: "grid", gap: 18 }} className="g2e grid">
                  <div>
                    <div
                      className="eyebrow dim"
                      style={{ marginBottom: 10, color: "var(--text-dim)" }}
                    >
                      Program
                    </div>
                    <div className="scroll-x">
                      <div
                        className="segmented"
                        role="group"
                        aria-label="Program"
                        data-testid="discover-programs"
                      >
                        <Link
                          href={withParams("/discover", cur, { program: null })}
                          aria-current={!prog ? "true" : undefined}
                        >
                          All
                        </Link>
                        {PROGRAM_CATALOG.filter((d) => have.has(d.slug)).map((d) => (
                          <Link
                            key={d.slug}
                            href={withParams("/discover", cur, { program: d.alias })}
                            aria-current={prog?.slug === d.slug ? "true" : undefined}
                          >
                            {d.short}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      className="eyebrow dim"
                      style={{ marginBottom: 10, color: "var(--text-dim)" }}
                    >
                      Experience
                    </div>
                    <div
                      className="segmented"
                      role="group"
                      aria-label="Experience (not available)"
                      aria-disabled="true"
                      style={{ opacity: 0.5 }}
                    >
                      {["Beginner", "Intermediate", "Advanced"].map((l) => (
                        <button key={l} type="button" disabled>
                          {l}
                        </button>
                      ))}
                    </div>
                    <p className="hint" style={{ marginTop: 8 }}>
                      Sources do not record difficulty yet, so this is not used.
                    </p>
                  </div>
                </div>
              </section>

              <section className="block" aria-labelledby="res-h">
                {interests.length === 0 ? (
                  <EmptyState
                    title="Start with an interest"
                    action={
                      <Link className="btn primary" href="/projects">
                        Browse the full catalog
                      </Link>
                    }
                  >
                    Choose one or more interests above and matching projects appear here with the
                    reasons.
                  </EmptyState>
                ) : matched.length === 0 ? (
                  <EmptyState
                    title="No recorded project matches these interests"
                    action={
                      <Link className="btn" href="/discover">
                        Clear interests
                      </Link>
                    }
                  >
                    This does not mean none exist. The development build holds a small recorded
                    sample.
                  </EmptyState>
                ) : (
                  <>
                    <h2 id="res-h" style={{ fontSize: 26 }}>
                      Projects matching your interests
                    </h2>
                    <p className="muted" style={{ margin: "6px 0 20px" }} data-testid="match-count">
                      {matched.length} match{matched.length > 1 ? "es" : ""}. Ordered by how many of
                      your interests they cover, then A to Z.
                    </p>
                    <div className="grid g2e" data-testid="results">
                      {matched.map(({ p, hits }) => (
                        <ProjectCard
                          key={p.id}
                          p={p}
                          why={why(p, hits)}
                          saved={isSaved(saved, p)}
                        />
                      ))}
                    </div>
                  </>
                )}
                <div style={{ marginTop: 24 }}>
                  <Notice kind="dev">
                    <strong>Development data.</strong> Matches come from a small recorded sample,
                    not live data.
                  </Notice>
                </div>
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}
