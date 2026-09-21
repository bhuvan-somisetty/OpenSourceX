import Link from "next/link";
import type { Metadata } from "next";
import { listPrograms } from "@opensourcex/database";
import { load } from "@/lib/data";
import { DbDown, Notice } from "@/components/feedback/Notice";
import { SourceBadge } from "@/components/source/SourceBadge";
import { StatusChip } from "@/components/status/StatusChip";

export const metadata: Metadata = { title: "Programs" };
export const dynamic = "force-dynamic";

export default async function Programs() {
  const res = await load(listPrograms);
  return (
    <div className="wrap" style={{ paddingTop: 32 }}>
      <div className="eyebrow">Programs</div>
      <h1 className="page">Programs in the recorded dataset</h1>
      <p className="sub">
        Google Summer of Code and LFX Mentorship (with the CNCF ecosystem distinguished).
      </p>
      <Notice kind="dev">
        <strong>Development data.</strong> These are recorded samples, not live and not complete
        coverage.
      </Notice>
      <div style={{ marginTop: 16 }}>
        {!res.ok ? (
          <DbDown />
        ) : (
          <div className="grid g2e" data-testid="program-list">
            {res.data.map((p) => (
              <article className="card fade" key={p.slug}>
                <div className="chips" style={{ marginBottom: 8 }}>
                  <StatusChip status="DEVELOPMENT" />
                  <StatusChip status="RECORDED" />
                </div>
                <h2 style={{ fontSize: 20 }}>
                  <Link
                    href={`/programs/${p.slug}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {p.name}
                  </Link>
                </h2>
                <dl className="kv">
                  <dt>Granularity</dt>
                  <dd>
                    {p.granularity === "organization_year"
                      ? "Organization / year. Project-level and mentor history: not verified."
                      : "Project / term (CNCF ecosystem only in this dataset)."}
                  </dd>
                  {p.years.length > 0 && (
                    <>
                      <dt>Years</dt>
                      <dd>{p.years.join(", ")}</dd>
                    </>
                  )}
                  {p.organizations > 0 && (
                    <>
                      <dt>Organizations</dt>
                      <dd>{p.organizations} recorded</dd>
                    </>
                  )}
                  {p.mentorshipProjects > 0 && (
                    <>
                      <dt>Projects</dt>
                      <dd>{p.mentorshipProjects} recorded</dd>
                    </>
                  )}
                  {p.terms > 0 && (
                    <>
                      <dt>Terms</dt>
                      <dd>{p.terms} canonical</dd>
                    </>
                  )}
                  {p.ecosystems.map((e) => (
                    <div key={e.key} style={{ display: "contents" }}>
                      <dt>Ecosystem</dt>
                      <dd>
                        {e.name}: {e.note}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="actions">
                  <Link className="btn sm" href={`/programs/${p.slug}`}>
                    Open program
                  </Link>
                </div>
                {p.sources.map((s) => (
                  <SourceBadge key={s.provenanceId} source={s} />
                ))}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
