import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms, listProjects, listSaved } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { DbDown } from "@/components/feedback/Notice";
import { ProjectRow } from "@/features/projects/ProjectRow";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function AppHome() {
  const session = await requireSession();
  const res = await load(async (d) => ({
    progs: await listPrograms(d),
    saved: await listSaved(d, session.userId),
    cards: (await listProjects(d)).items,
  }));

  return (
    <div className="wrap app-home">
      <section className="page-hero">
        <div className="hero-eyebrow-pill">
          <span className="hero-eyebrow-dot" aria-hidden="true" />
          <span className="eyebrow">Open Source Intelligence</span>
        </div>
        <h1 className="page hero-heading" style={{ marginTop: 16 }}>
          What are you exploring today?
        </h1>
        <form action="/projects" role="search" className="hero-search" style={{ marginTop: 28 }}>
          <div className="hero-search-icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <label htmlFor="app-q" className="skip">
            Search open source projects
          </label>
          <input
            id="app-q"
            type="search"
            name="q"
            placeholder="Search open source projects, technologies, repositories..."
          />
          <button className="btn primary hero-search-btn" type="submit">
            <span>Search</span>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>

        <div className="hero-search-hints">
          <span className="hero-hints-label">Trending:</span>
          {["Kubernetes", "PyTorch", "Rust", "Go", "TypeScript", "Cloud Native"].map((tag) => (
            <Link
              key={tag}
              href={`/projects?q=${encodeURIComponent(tag)}`}
              className="hero-hint-chip"
            >
              {tag}
            </Link>
          ))}
        </div>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        (() => {
          const byId = new Map(res.data.cards.map((c) => [c.id, c]));
          const recent = res.data.saved
            .slice(0, 3)
            .map((r) => byId.get(r.entityId))
            .filter((c) => !!c);
          return (
            <>
              <section className="block" aria-labelledby="cont-h">
                <div className="section-head">
                  <h2 id="cont-h">Continue exploring</h2>
                  {recent.length > 0 && (
                    <Link href="/saved" className="section-link">
                      Saved workspace ({res.data.saved.length}) →
                    </Link>
                  )}
                </div>
                {recent.length === 0 ? (
                  <div className="empty-saved-prompt card">
                    <div className="empty-saved-icon" aria-hidden="true">
                      ★
                    </div>
                    <div className="empty-saved-content">
                      <strong>Nothing saved yet</strong>
                      <p className="muted" style={{ margin: "4px 0 0", fontSize: 14 }}>
                        Save projects, organizations, or repositories while browsing to build your
                        workspace.
                      </p>
                    </div>
                    <Link href="/discover" className="btn sm primary">
                      Discover projects
                    </Link>
                  </div>
                ) : (
                  <div style={{ marginTop: 14 }} data-testid="recent-saved">
                    {recent.map((c) => (
                      <ProjectRow key={c!.id} p={c!} saved />
                    ))}
                    <p style={{ marginTop: 16 }}>
                      <Link href="/saved" className="section-link">
                        Open your saved workspace →
                      </Link>
                    </p>
                  </div>
                )}
              </section>

              <section className="block" aria-labelledby="next-h">
                <div className="section-head">
                  <h2 id="next-h">Recommended next step</h2>
                </div>
                <div className="grid g3" style={{ marginTop: 18 }}>
                  {[
                    [
                      "01",
                      "Explore a project",
                      "Start from your interests and see why each project fits.",
                      "/discover",
                    ],
                    [
                      "02",
                      "Analyze a repository",
                      "Understand any GitHub repository structure and guidelines.",
                      "/repositories/analyze",
                    ],
                    [
                      "03",
                      "Practice an interview",
                      "Explain an open-source project in your own words with evidence.",
                      "/interview",
                    ],
                  ].map(([num, t, d, h]) => (
                    <Link key={t} href={h!} className="card hover next-step-card">
                      <div className="next-step-num">{num}</div>
                      <h3 className="next-step-title">{t}</h3>
                      <p className="muted next-step-desc">{d}</p>
                      <div className="next-step-footer">
                        <span>Get started</span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 16 16"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 8h9m0 0L8.5 4.5M12 8l-3.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}
