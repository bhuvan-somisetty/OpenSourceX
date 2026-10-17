import Link from "next/link";
import type { SourceInfo } from "@opensourcex/database";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import { SaveButton } from "@/features/saved/SaveButton";

export interface Why {
  ok: boolean | null;
  text: string;
}

export interface DiscoverOrg {
  /** saved-item id (`org:<program>/<slug>`) of the organization's main program */
  id: string;
  /** saved-item ids for every program the organization is in */
  saveIds?: string[];
  name: string;
  slug: string;
  programSlug: string;
  programName: string;
  /** every program this organization took part in, newest first */
  programs?: { slug: string; name: string; href: string; latest: string; years: string }[];
  description: string | null;
  technologies: string[];
  topics: string[];
  latestTerm: string;
  projectCount: number;
  yearCount: number;
  years: number[];
  repoUrl: string | null;
  href: string;
  /** logo file for organizations from program lists (LFX ones use OrgLogo by slug) */
  logo?: string | null;
  logoOnDark?: boolean;
  source?: SourceInfo;
}

/**
 * Compact Discover card, the same size and layout as the program directory cards (three per
 * row), with every program the organization belongs to and a save button in the top-right corner.
 */
export function DiscoveryOrgCard({
  org,
  hits = [],
  savedId = null,
}: {
  org: DiscoverOrg;
  hits?: string[];
  /** the saved-item id this session already saved for the organization, if any */
  savedId?: string | null;
}) {
  const matched = new Set(hits.map((h) => h.toLowerCase()));
  const tags = [
    ...org.technologies.filter((t) => matched.has(t.toLowerCase())),
    ...org.technologies.filter((t) => !matched.has(t.toLowerCase())),
  ];
  const programs = org.programs?.length
    ? org.programs
    : [{ slug: org.programSlug, name: org.programName, href: org.href, latest: "", years: "" }];
  const years =
    org.years.length > 1
      ? `${Math.min(...org.years)}–${Math.max(...org.years)}`
      : org.years.length === 1
        ? String(org.years[0])
        : "";

  return (
    <div className="org-card-wrap" data-testid={`discovery-org-card-${org.slug}`}>
      <Link href={org.href} className="card hover lfx-org-card">
        <div className="lfx-org-card-top">
          {org.logo ? (
            <ProgramOrgLogo src={org.logo} name={org.name} size={52} dark={org.logoOnDark} />
          ) : (
            <OrgLogo slug={org.slug} name={org.name} size={52} />
          )}
          <div className="lfx-org-card-title-wrap">
            <h3 className="lfx-org-card-title">{org.name}</h3>
            <div className="discover-programs">
              {programs.slice(0, 3).map((p) => (
                <span
                  key={p.slug}
                  className="pill lfx-org-latest-pill"
                  title={p.years ? `${p.name}: ${p.years}` : p.name}
                  data-testid="discover-program"
                >
                  {p.name}
                </span>
              ))}
              {programs.length > 3 && <span className="dim">+{programs.length - 3}</span>}
            </div>
          </div>
        </div>

        {org.description ? (
          <p className="muted lfx-org-card-desc">{org.description}</p>
        ) : (
          <p className="dim lfx-org-card-desc" style={{ fontStyle: "italic" }}>
            {org.programName} participant
          </p>
        )}

        {tags.length > 0 && (
          <div className="chips lfx-org-card-tech">
            {tags.slice(0, 4).map((t) => {
              const hit = matched.has(t.toLowerCase());
              return (
                <span key={t} className={hit ? "tag discover-hit" : "tag"}>
                  {hit ? `✓ ${t}` : t}
                </span>
              );
            })}
            {tags.length > 4 && (
              <span className="dim" style={{ fontSize: 11, alignSelf: "center" }}>
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="lfx-org-card-footer">
          <div className="lfx-org-stats">
            <span className="lfx-org-stat-item">
              {org.projectCount > 0 ? (
                <>
                  <strong>{org.projectCount}</strong> project{org.projectCount === 1 ? "" : "s"}
                </>
              ) : (
                <>
                  <strong>{programs.length}</strong> program{programs.length === 1 ? "" : "s"}
                </>
              )}
            </span>
            {years && (
              <>
                <span className="dim">·</span>
                <span className="lfx-org-stat-item dim">{years}</span>
              </>
            )}
          </div>
          <span className="lfx-org-explore-link">Explore Organization →</span>
        </div>
      </Link>
      <div className="org-card-save">
        <SaveButton
          entityType="ORGANIZATION"
          entityId={savedId ?? org.id}
          initialSaved={Boolean(savedId)}
          compact
          label={org.name}
        />
      </div>
    </div>
  );
}
