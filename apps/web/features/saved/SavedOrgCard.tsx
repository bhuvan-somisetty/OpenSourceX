import Link from "next/link";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import { SaveButton } from "@/features/saved/SaveButton";
import type { SavedOrg } from "@/lib/saved-orgs";

/** A saved organization on the Saved page, in the same card style as the program directories. */
export function SavedOrgCard({ org }: { org: SavedOrg }) {
  return (
    <div className="org-card-wrap" data-testid="saved-item" data-kind="organization">
      <Link href={org.href} className="card hover lfx-org-card">
        <div className="lfx-org-card-top">
          {org.logo ? (
            <ProgramOrgLogo src={org.logo} name={org.name} size={52} dark={org.logoOnDark} />
          ) : (
            <OrgLogo slug={org.lfxSlug ?? org.name} name={org.name} size={52} />
          )}
          <div className="lfx-org-card-title-wrap">
            <h3 className="lfx-org-card-title">{org.name}</h3>
            <div className="discover-programs">
              <span className="pill lfx-org-latest-pill">{org.programShort}</span>
              {org.years && <span className="dim">{org.years}</span>}
            </div>
          </div>
        </div>
        {org.description ? (
          <p className="muted lfx-org-card-desc">{org.description}</p>
        ) : (
          <p className="dim lfx-org-card-desc" style={{ fontStyle: "italic" }}>
            {org.programName} organization
          </p>
        )}
        <div className="lfx-org-card-footer">
          <div className="lfx-org-stats">
            <span className="lfx-org-stat-item dim">{org.programName}</span>
          </div>
          <span className="lfx-org-explore-link">Explore Organization →</span>
        </div>
      </Link>
      <div className="org-card-save">
        <SaveButton
          entityType="ORGANIZATION"
          entityId={org.id}
          initialSaved
          compact
          label={org.name}
        />
      </div>
    </div>
  );
}
