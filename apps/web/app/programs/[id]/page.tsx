import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProgram } from "@opensourcex/database";
import { derivedTermStatus } from "@opensourcex/entity-resolution";
import { load } from "@/lib/data";
import { DbDown, Notice } from "@/components/feedback/Notice";
import { SourceBadge } from "@/components/source/SourceBadge";
import { StatusChip } from "@/components/status/StatusChip";
import { TermRibbon } from "@/components/data-display/TermRibbon";
import { ProjectCard } from "@/features/discovery/ProjectCard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Program" };

export default async function ProgramDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await load((d) => getProgram(d, id));
  if (!res.ok)
    return (
      <div className="wrap" style={{ paddingTop: 32 }}>
        <DbDown />
      </div>
    );
  if (!res.data) notFound();
  const prog = res.data;
  const s = prog.summary;

  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="spine" aria-label="Path">
        <Link href="/programs">Programs</Link>›
        <span className="pill" aria-current="page">
          {s.name}
        </span>
        {prog.kind === "mentorship" && (
          <>
            ›<span className="pill">CNCF ecosystem</span>
          </>
        )}
      </div>
      <h1 className="page" style={{ marginTop: 16 }}>
        {s.name}
      </h1>
      <div className="chips">
        <StatusChip status="DEVELOPMENT" />
        <StatusChip status="RECORDED" />
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {prog.kind === "gsoc" ? (
          <Notice kind="info" testId="granularity-note">
            <strong>Granularity: organization and year.</strong> The recorded source says an{" "}
            <em>organization</em> participated in a year (for example &quot;Organization
            participated in GSoC 2025&quot;). Project-level participation and mentor history are{" "}
            <strong>not verified</strong> and are never inferred.
          </Notice>
        ) : (
          <Notice kind="info" testId="ecosystem-note">
            <strong>CNCF ecosystem only.</strong> This shows CNCF-listed LFX Mentorship projects
            from the CNCF mentoring repository. It is <strong>not</strong> the whole LFX Mentorship
            program.
          </Notice>
        )}
        <Notice kind="dev">
          <strong>Recorded sample.</strong> A few entries recorded on the dates shown in each source
          badge; not live and not complete.
        </Notice>
      </div>

      {prog.kind === "gsoc" ? (
        <>
          <section style={{ marginTop: 32 }} aria-labelledby="yrs">
            <h2 id="yrs">Participating organizations by year</h2>
            <TermRibbon
              caption="Organization participation by year (organization level)"
              columns={prog.years.map((y) => String(y.year))}
              rows={[
                {
                  label: (
                    <>
                      {s.name}
                      <br />
                      <span
                        className="muted"
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
            {prog.years.map((y) => (
              <div key={y.year} style={{ marginTop: 24 }}>
                <h3>{y.year}</h3>
                <div className="grid g3" style={{ marginTop: 12 }}>
                  {y.orgs.map((p) => (
                    <ProjectCard key={p.id} p={p} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : (
        <section style={{ marginTop: 32 }} aria-labelledby="tl">
          <h2 id="tl">Terms and timeline</h2>
          {prog.terms.length === 0 ? (
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
                        LFX Mentorship, CNCF projects only
                        <br />
                        <span
                          className="muted"
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
              {prog.terms.map((t) => {
                const st = derivedTermStatus({ startsOn: t.startsOn, endsOn: t.endsOn });
                return (
                  <div
                    key={`${t.year}${t.code}${t.track}`}
                    style={{ marginTop: 24 }}
                    data-testid="term-block"
                  >
                    <h3>
                      {t.year} · {t.code}
                      {t.track !== "unspecified" ? ` · ${t.track}` : ""}
                    </h3>
                    <p className="muted" style={{ margin: "4px 0 8px" }}>
                      {t.startsOn ?? "?"} → {t.endsOn ?? "?"} · status derived from dates:{" "}
                      <strong>{st.replace("_", " ")}</strong>
                      {t.rawNames.length > 0 && (
                        <>
                          {" "}
                          · source spelling:{" "}
                          {t.rawNames.map((r) => (
                            <span className="tag" key={r}>
                              {r}
                            </span>
                          ))}
                        </>
                      )}
                    </p>
                    <div className="grid g3">
                      {t.projects.map((p) => (
                        <ProjectCard key={p.id} p={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </section>
      )}

      <section style={{ marginTop: 32 }} aria-labelledby="src">
        <h2 id="src">Sources</h2>
        {s.sources.map((x) => (
          <SourceBadge key={x.provenanceId} source={x} />
        ))}
        <p className="hint" style={{ marginTop: 8 }}>
          Official program page:{" "}
          <a href={s.officialUrl} target="_blank" rel="noreferrer noopener">
            {s.officialUrl}
          </a>
        </p>
      </section>
    </div>
  );
}
