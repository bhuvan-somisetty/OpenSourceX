import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms } from "@opensourcex/database";
import { load } from "@/lib/data";
import { PROGRAM_CATALOG } from "@/lib/programs";
import { DbDown } from "@/components/feedback/Notice";
import { ProgramMark } from "@/components/ui/ProgramMark";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default async function Programs() {
  const res = await load(listPrograms);
  const bySlug = new Map(res.ok ? res.data.map((p) => [p.slug, p]) : []);
  const available = PROGRAM_CATALOG.filter(
    (d) =>
      (bySlug.get(d.slug)?.organizations ?? 0) + (bySlug.get(d.slug)?.mentorshipProjects ?? 0) > 0,
  );
  const soon = PROGRAM_CATALOG.filter((d) => !available.includes(d));

  return (
    <div className="wrap">
      <section className="page-hero">
        <div className="eyebrow">Programs</div>
        <h1 className="page" style={{ marginTop: 14 }}>
          Where do you want to contribute?
        </h1>
        <p className="sub">
          Choose a program to explore its organizations, projects, history and contribution paths.
        </p>
      </section>

      {!res.ok ? (
        <DbDown />
      ) : (
        <>
          <div className="grid g2e" data-testid="program-list">
            {available.map((d) => {
              const s = bySlug.get(d.slug)!;
              return (
                <Link
                  key={d.slug}
                  href={`/programs/${d.slug}`}
                  className="tile fade"
                  data-testid={`program-tile-${d.alias}`}
                >
                  <ProgramMark slug={d.slug} />
                  <div>
                    <h3>{d.name}</h3>
                    <p className="muted" style={{ margin: "8px 0 0", maxWidth: "40ch" }}>
                      {d.blurb}
                    </p>
                  </div>
                  <div className="facts">
                    {s.years.length > 0 && (
                      <span className="tag">{s.years[s.years.length - 1]}</span>
                    )}
                    {s.organizations > 0 && (
                      <span className="tag">{s.organizations} organizations recorded</span>
                    )}
                    {s.mentorshipProjects > 0 && (
                      <span className="tag">{s.mentorshipProjects} projects recorded</span>
                    )}
                    {s.terms > 0 && (
                      <span className="tag">
                        {s.terms} term{s.terms > 1 ? "s" : ""}
                      </span>
                    )}
                    {s.ecosystems.map((e) => (
                      <span className="tag" key={e.key}>
                        {e.name} ecosystem only
                      </span>
                    ))}
                  </div>
                  <span
                    className="btn primary sm"
                    style={{ alignSelf: "flex-start", position: "relative", zIndex: 1 }}
                  >
                    Explore {d.short}
                  </span>
                </Link>
              );
            })}
          </div>

          {soon.length > 0 && (
            <section className="block" aria-labelledby="soon-h">
              <h2 id="soon-h" style={{ fontSize: 22 }}>
                Configured, no data yet
              </h2>
              <p className="sub">
                These programs are set up in OpenSourceX but have no recorded data in this build, so
                there is nothing to explore yet.
              </p>
              <div className="grid g3" style={{ marginTop: 16 }} data-testid="programs-soon">
                {soon.map((d) => (
                  <div key={d.slug} className="tile soon">
                    <ProgramMark slug={d.slug} />
                    <div>
                      <h3 style={{ fontSize: 20 }}>{d.name}</h3>
                      <p className="dim" style={{ margin: "4px 0 0", fontSize: 14 }}>
                        No data in this build yet
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
