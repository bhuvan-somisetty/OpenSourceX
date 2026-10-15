import Link from "next/link";
import { Notice } from "@/components/feedback/Notice";
import { OrgCommunity } from "@/features/lfx/OrgCommunity";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import { yearRange, type ProgramData, type ProgramOrg } from "@/lib/program-data";

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
    </svg>
  );
}

/** Organization page for programs whose data comes from the committed program files. */
export function ProgramOrgPage({
  data,
  org,
  programSlug,
  programShort,
}: {
  data: ProgramData;
  org: ProgramOrg;
  programSlug: string;
  programShort: string;
}) {
  const repo = org.repoUrl ?? org.sourceCodeUrl ?? null;
  const range = yearRange(org.years);
  const projects = org.projects ?? [];

  return (
    <div className="wrap">
      <section className="page-hero" data-testid="org-hero">
        <div className="spine" aria-label="Program navigation">
          <Link href="/programs">Programs</Link>›
          <Link href={`/programs/${programSlug}`}>{programShort}</Link>›
          <span className="pill" aria-current="page">
            {org.name}
          </span>
        </div>

        <div className="lfx-org-hero-content" style={{ marginTop: 24 }}>
          <div className="lfx-org-hero-top">
            <ProgramOrgLogo src={org.logo} name={org.name} size={72} />
            <div>
              <div className="eyebrow">Organization · {data.name}</div>
              <h1 className="page" style={{ marginTop: 6, fontSize: "clamp(26px, 4vw, 36px)" }}>
                {org.name}
              </h1>
            </div>
            {repo && (
              <a
                className="btn primary org-repo-btn"
                href={repo}
                target="_blank"
                rel="noreferrer noopener"
                data-testid="open-org-repo"
              >
                <GithubIcon />
                {/github\.com\/[^/]+\/?$/.test(repo) ? "Open GitHub ↗" : "Open repository ↗"}
              </a>
            )}
          </div>

          {(org.tagline || org.description) && (
            <p className="sub" style={{ marginTop: 14, maxWidth: "70ch" }}>
              {org.tagline ?? org.description}
            </p>
          )}
          {org.tagline && org.description && org.description !== org.tagline && (
            <p className="muted" style={{ marginTop: 8, maxWidth: "75ch", lineHeight: 1.6 }}>
              {org.description}
            </p>
          )}

          <div className="chips" style={{ marginTop: 16 }}>
            {range && (
              <span className="pill">
                <strong>{org.years.length}</strong> year{org.years.length === 1 ? "" : "s"} in {programShort} ({range})
              </span>
            )}
            {projects.length > 0 && (
              <span className="pill">
                <strong>{projects.length}</strong> recorded project{projects.length === 1 ? "" : "s"}
              </span>
            )}
            {org.tags.slice(0, 8).map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>

          <div className="actions" style={{ marginTop: 20 }}>
            {org.website && (
              <a className="btn" href={org.website} target="_blank" rel="noreferrer noopener">
                Website ↗
              </a>
            )}
            {org.links.map((l) => (
              <a key={l.url} className="btn" href={l.url} target="_blank" rel="noreferrer noopener">
                {l.label} ↗
              </a>
            ))}
            <Link className="btn" href={`/programs/${programSlug}`}>
              ← Back to Organizations
            </Link>
          </div>
        </div>
      </section>

      <OrgCommunity
        community={{ repoUrl: repo, chats: org.chats, source: org.chatSource ?? null }}
        orgName={org.name}
      />

      {projects.length > 0 && (
        <section className="block" style={{ marginTop: 32 }} aria-labelledby="porg-projects-h">
          <div className="section-head">
            <h2 id="porg-projects-h">Projects</h2>
            <span className="dim">As listed by {data.name}</span>
          </div>
          <ul className="porg-projects">
            {projects.map((p, i) => (
              <li key={`${p.year}-${i}`} className="porg-project">
                <span className="pill porg-project-year">{p.round ?? p.year}</span>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer noopener">
                    {p.title}
                  </a>
                ) : (
                  <span>{p.title}</span>
                )}
                {p.product && <span className="dim"> · {p.product}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div style={{ marginTop: 28 }}>
        <Notice kind="info">
          <strong>Source.</strong> {org.name} is listed by{" "}
          <a href={org.sourceUrl} target="_blank" rel="noreferrer noopener">
            {data.name}
          </a>
          . Repository, logo and chat links come from the program listing or from the
          organization&apos;s own GitHub and website. Data collected {data.generatedAt}.
        </Notice>
      </div>
    </div>
  );
}
