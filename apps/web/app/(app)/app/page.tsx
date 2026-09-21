import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms, listProjects, listSaved } from "@opensourcex/database";
import { requireSession } from "@/lib/auth";
import { load } from "@/lib/data";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { DbDown } from "@/components/feedback/Notice";
import { ProgramMark } from "@/components/ui/ProgramMark";
import { ProjectRow } from "@/features/projects/ProjectRow";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function AppHome() {
  const session = await requireSession();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning." : hour < 18 ? "Good afternoon." : "Good evening.";
  const res = await load(async (d) => ({
    progs: await listPrograms(d),
    saved: await listSaved(d, session.userId),
    cards: (await listProjects(d)).items,
  }));

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">{greeting}</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          What are you exploring today?
        </h1>
        <form action="/projects" role="search" className="hero-search" style={{ marginTop: 28 }}>
          <label htmlFor="app-q" className="skip">
            Search open source projects
          </label>
          <input id="app-q" type="search" name="q" placeholder="Search open source projects..." />
          <button className="btn primary" type="submit">
            Search
          </button>
        </form>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        (() => {
          const have = res.data.progs.filter((p) => p.organizations + p.mentorshipProjects > 0);
          const byId = new Map(res.data.cards.map((c) => [c.id, c]));
          const recent = res.data.saved
            .slice(0, 3)
            .map((r) => byId.get(r.entityId))
            .filter((c) => !!c);
          return (
            <>
              <section className="block" aria-labelledby="choose-h">
                <h2 id="choose-h" style={{ fontSize: 24 }}>
                  Choose a program
                </h2>
                <div className="grid g3" style={{ marginTop: 18 }}>
                  {have.map((p) => {
                    const d = PROGRAM_CATALOG.find((x) => x.slug === p.slug);
                    return (
                      <Link
                        key={p.slug}
                        href={`/programs/${p.slug}`}
                        className="card hover"
                        style={{ display: "flex", gap: 16, alignItems: "center" }}
                      >
                        <ProgramMark slug={p.slug} />
                        <span>
                          <strong style={{ fontSize: 18 }}>{d?.name ?? p.name}</strong>
                          <span className="dim" style={{ display: "block", fontSize: 13 }}>
                            {d?.tagline}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                  <Link
                    href="/programs"
                    className="card hover dim"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    All programs →
                  </Link>
                </div>
              </section>

              <section className="block" aria-labelledby="cont-h">
                <h2 id="cont-h" style={{ fontSize: 24 }}>
                  Continue exploring
                </h2>
                {recent.length === 0 ? (
                  <p className="muted" style={{ marginTop: 10 }}>
                    Nothing saved yet. <Link href="/discover">Discover projects</Link> and save the
                    ones worth returning to.
                  </p>
                ) : (
                  <div style={{ marginTop: 14 }} data-testid="recent-saved">
                    {recent.map((c) => (
                      <ProjectRow key={c!.id} p={c!} saved />
                    ))}
                    <p style={{ marginTop: 14 }}>
                      <Link href="/saved">Open your saved workspace →</Link>
                    </p>
                  </div>
                )}
              </section>

              <section className="block" aria-labelledby="next-h">
                <h2 id="next-h" style={{ fontSize: 24 }}>
                  Recommended next step
                </h2>
                <div className="grid g3" style={{ marginTop: 18 }}>
                  {[
                    [
                      "Explore a project",
                      "Start from your interests and see why each project fits.",
                      "/discover",
                    ],
                    [
                      "Analyze a repository",
                      "Understand any GitHub repository (live analysis is not enabled yet).",
                      "/repositories/analyze",
                    ],
                    ["Practice an interview", "Explain a project in your own words.", "/interview"],
                  ].map(([t, d, h]) => (
                    <Link key={t} href={h!} className="card hover">
                      <h3>{t}</h3>
                      <p className="muted" style={{ margin: "8px 0 0", fontSize: 15 }}>
                        {d}
                      </p>
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
