import Link from "next/link";
import type { Metadata } from "next";
import {
  listProjects,
  listSaved,
  type ProjectCard as Card,
  type SavedRow,
} from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { PROGRAM_CATALOG, programDef, resolveProgram } from "@/lib/programs";
import { first, withParams, type Params } from "@/lib/url";
import { DbDown, EmptyState } from "@/components/feedback/Notice";
import { ProjectRow } from "@/features/projects/ProjectRow";
import { SaveButton } from "@/features/saved/SaveButton";
import { StatusChip } from "@/components/status/StatusChip";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

const TYPES = [
  ["all", "All"],
  ["PROJECT", "Projects"],
  ["REPOSITORY", "Repositories"],
  ["ORGANIZATION", "Organizations"],
] as const;

export default async function Saved({ searchParams }: { searchParams: Promise<Params> }) {
  const session = await requireSession();
  const sp = await searchParams;
  const type = TYPES.some((t) => t[0] === first(sp.type)) ? first(sp.type) : "all";
  const prog = resolveProgram(first(sp.program));
  const cur: Params = { type, program: prog?.alias ?? "" };
  const res = await load(async (d) => ({
    rows: await listSaved(d, session.userId),
    cards: (await listProjects(d)).items,
  }));

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Saved</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Your saved open source
        </h1>
        <p className="sub">
          Keep the projects, repositories and organizations you want to explore later.
        </p>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        (() => {
          const byId = new Map<string, Card>(res.data.cards.map((c) => [c.id, c]));
          const all = res.data.rows;
          const rowSlug = (r: SavedRow) => r.programSlug ?? "other";
          const counts = new Map<string, number>();
          for (const r of all) counts.set(rowSlug(r), (counts.get(rowSlug(r)) ?? 0) + 1);
          const rows = all.filter(
            (r) => (type === "all" || r.entityType === type) && (!prog || rowSlug(r) === prog.slug),
          );
          const groups = new Map<string, SavedRow[]>();
          for (const r of rows) groups.set(rowSlug(r), [...(groups.get(rowSlug(r)) ?? []), r]);
          const label = (slug: string) =>
            slug === "other" ? "Other" : (programDef(slug)?.name ?? slug);

          if (all.length === 0) {
            return (
              <EmptyState
                title="You haven't saved anything yet."
                action={
                  <Link className="btn primary" href="/projects" data-testid="saved-empty-cta">
                    Explore Projects
                  </Link>
                }
              >
                Save a project, repository or organization and it will live here, organized by
                program.
              </EmptyState>
            );
          }
          return (
            <>
              <div
                className="card"
                style={{ display: "grid", gap: 16 }}
                data-testid="saved-summary"
              >
                <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <div className="stat" data-testid="saved-total">
                      {all.length}
                    </div>
                    <div className="stat-label">saved item{all.length > 1 ? "s" : ""}</div>
                  </div>
                  {[...counts.entries()].map(([slug, n]) => (
                    <div key={slug}>
                      <div className="stat" style={{ fontSize: 28 }}>
                        {n}
                      </div>
                      <div className="stat-label">
                        {PROGRAM_CATALOG.find((d) => d.slug === slug)?.short ?? "Other"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
                <div className="scroll-x">
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Type"
                    data-testid="saved-types"
                  >
                    {TYPES.map(([k, l]) => (
                      <Link
                        key={k}
                        href={withParams("/saved", cur, { type: k })}
                        aria-current={type === k ? "true" : undefined}
                      >
                        {l}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="scroll-x">
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Program"
                    data-testid="saved-programs"
                  >
                    <Link
                      href={withParams("/saved", cur, { program: null })}
                      aria-current={!prog ? "true" : undefined}
                    >
                      All programs
                    </Link>
                    {[...counts.keys()].map((slug) => {
                      const d = PROGRAM_CATALOG.find((x) => x.slug === slug);
                      return (
                        <Link
                          key={slug}
                          href={withParams("/saved", cur, { program: d?.alias ?? slug })}
                          aria-current={prog?.slug === slug ? "true" : undefined}
                        >
                          {d?.short ?? "Other"}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {rows.length === 0 ? (
                <div style={{ marginTop: 28 }}>
                  <EmptyState
                    title="Nothing saved with these filters"
                    action={
                      <Link className="btn" href="/saved">
                        Show everything
                      </Link>
                    }
                  >
                    Try another type or program.
                  </EmptyState>
                </div>
              ) : (
                [...groups.entries()].map(([slug, items]) => (
                  <section
                    key={slug}
                    className="block"
                    aria-labelledby={`g-${slug}`}
                    data-testid={`saved-group-${slug}`}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <h2 id={`g-${slug}`} style={{ fontSize: 24 }}>
                        {label(slug)}
                      </h2>
                      <span className="dim" data-testid="group-count">
                        {items.length} saved
                      </span>
                    </div>
                    <div style={{ marginTop: 14 }}>
                      {items.map((r) => {
                        if (r.entityType === "REPOSITORY") {
                          return (
                            <div className="prow" key={r.id} data-testid="saved-item">
                              <div className="t">
                                <a
                                  href={r.entityId}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="mono"
                                  style={{ fontSize: 15 }}
                                >
                                  {r.entityId.replace("https://", "")}
                                </a>
                                <div className="dim" style={{ fontSize: 13 }}>
                                  Repository
                                </div>
                              </div>
                              <div className="m">
                                <StatusChip status="UNKNOWN" label="Not analyzed" />
                              </div>
                              <SaveButton
                                entityType="REPOSITORY"
                                entityId={r.entityId}
                                initialSaved
                                compact
                                label="repository"
                              />
                            </div>
                          );
                        }
                        const c = byId.get(r.entityId);
                        return c ? (
                          <div key={r.id} data-testid="saved-item">
                            <ProjectRow p={c} saved />
                          </div>
                        ) : (
                          <div className="prow" key={r.id}>
                            <div className="t dim">No longer in the dataset ({r.entityId})</div>
                            <div />
                            <SaveButton
                              entityType={r.entityType}
                              entityId={r.entityId}
                              initialSaved
                              compact
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
