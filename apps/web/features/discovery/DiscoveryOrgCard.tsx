import Link from "next/link";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { SaveButton } from "@/features/saved/SaveButton";
import { SourceBadge } from "@/components/source/SourceBadge";
import type { SourceInfo } from "@opensourcex/database";

export interface Why {
  ok: boolean | null;
  text: string;
}

export interface DiscoverOrg {
  id: string;
  name: string;
  slug: string;
  programSlug: string;
  programName: string;
  description: string | null;
  technologies: string[];
  topics: string[];
  latestTerm: string;
  projectCount: number;
  yearCount: number;
  years: number[];
  repoUrl: string | null;
  href: string;
  source?: SourceInfo;
}

export function DiscoveryOrgCard({
  org,
  hits = [],
  why,
  saved = false,
}: {
  org: DiscoverOrg;
  hits?: string[];
  why?: Why[];
  saved?: boolean;
}) {
  const norm = (s: string) => s.toLowerCase();
  const matchedHits = new Set(hits.map(norm));

  return (
    <article
      className="card hover fade"
      data-testid={`discovery-org-card-${org.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "22px",
        borderRadius: "var(--radius, 12px)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        transition: "transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <OrgLogo slug={org.slug} name={org.name} size={48} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="tag" style={{ fontSize: 11, fontWeight: 600 }}>
                  {org.programName}
                </span>
                {org.latestTerm && (
                  <span
                    className="pill"
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      background: "rgba(0, 153, 255, 0.12)",
                      color: "#0099ff",
                      fontWeight: 600,
                      borderRadius: 999,
                    }}
                  >
                    Latest: {org.latestTerm}
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  margin: "6px 0 0",
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                <Link
                  href={org.href}
                  style={{
                    color: "var(--text)",
                    textDecoration: "none",
                  }}
                >
                  {org.name}
                </Link>
              </h3>
            </div>
          </div>
          <SaveButton
            entityType="ORGANIZATION"
            entityId={org.id}
            initialSaved={saved}
            compact
            label={org.name}
          />
        </div>

        {org.description ? (
          <p
            className="muted"
            style={{
              margin: "14px 0 0",
              fontSize: 14,
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {org.description}
          </p>
        ) : (
          <p
            className="dim"
            style={{
              margin: "14px 0 0",
              fontSize: 13.5,
              fontStyle: "italic",
            }}
          >
            Active participating organization in open source mentorship programs.
          </p>
        )}

        {/* Technologies with matching hits highlighted */}
        {org.technologies.length > 0 && (
          <div className="chips" style={{ marginTop: 14, gap: 6 }}>
            {org.technologies.slice(0, 6).map((t) => {
              const isMatch = matchedHits.has(norm(t));
              return (
                <span
                  key={t}
                  className={isMatch ? "tag accent" : "tag"}
                  style={
                    isMatch
                      ? {
                          background: "rgba(0, 153, 255, 0.2)",
                          color: "#38bdf8",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                          fontWeight: 700,
                        }
                      : undefined
                  }
                >
                  {isMatch ? `✓ ${t}` : t}
                </span>
              );
            })}
            {org.technologies.length > 6 && (
              <span className="dim" style={{ fontSize: 11, alignSelf: "center" }}>
                +{org.technologies.length - 6} more
              </span>
            )}
          </div>
        )}

        {why && why.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <strong
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-dim, #94a3b8)",
              }}
            >
              Why this organization
            </strong>
            <ul className="crit" data-testid="why-matches" style={{ marginTop: 8 }}>
              {why.map((w, i) => (
                <li key={i} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span
                    className={w.ok ? "c-ok" : "c-unk"}
                    aria-hidden="true"
                    style={{ flexShrink: 0, fontWeight: "bold" }}
                  >
                    {w.ok ? "✓" : "?"}
                  </span>
                  <span>{w.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-dim, #94a3b8)" }}>
            <strong>{org.projectCount}</strong> recorded project{org.projectCount === 1 ? "" : "s"}
            {org.yearCount > 1 && ` · ${org.yearCount} terms`}
          </div>

          <Link
            href={org.href}
            className="btn sm"
            style={{
              fontSize: 12,
              padding: "6px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Explore Org →
          </Link>
        </div>

        {org.source && (
          <div style={{ marginTop: 10 }}>
            <SourceBadge source={org.source} />
          </div>
        )}
      </div>
    </article>
  );
}
