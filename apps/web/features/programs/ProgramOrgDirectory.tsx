import Link from "next/link";
import { EmptyState } from "@/components/feedback/Notice";
import { Pager, pageOf, pageSlice } from "@/features/projects/Pager";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";
import { filterOrgs, tagFacets, yearRange, type OrgFilter, type ProgramData } from "@/lib/program-data";

/** Searchable grid of a program's organizations, filtered on the server from the URL. */
export function ProgramOrgDirectory({
  data,
  filter,
  page: pageParam,
  basePath,
}: {
  data: ProgramData;
  filter: OrgFilter;
  page?: string;
  basePath: string;
}) {
  const orgs = filterOrgs(data.orgs, filter);
  const tags = tagFacets(data.orgs);
  const page = pageOf(pageParam ?? "", orgs.length);
  const hasFilter = Boolean(filter.q || filter.tech || filter.year);

  return (
    <div>
      <form className="toolbar lfx-toolbar" method="get" aria-label="Filter organizations">
        <div className="field">
          <label htmlFor="porg-q">Search organizations</label>
          <input
            id="porg-q"
            type="search"
            name="q"
            defaultValue={filter.q}
            placeholder="Name, topic or technology"
          />
        </div>
        {tags.length > 0 && (
          <div className="field">
            <label htmlFor="porg-tech">Technology</label>
            <select id="porg-tech" name="tech" defaultValue={filter.tech}>
              <option value="">All technologies</option>
              {tags.slice(0, 120).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} ({t.n})
                </option>
              ))}
            </select>
          </div>
        )}
        {data.years.length > 1 && (
          <div className="field">
            <label htmlFor="porg-year">Year</label>
            <select id="porg-year" name="year" defaultValue={filter.year}>
              <option value="">All years</option>
              {[...data.years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        <button className="btn primary sm" type="submit">
          Filter
        </button>
        {hasFilter && (
          <Link href={basePath} className="btn sm">
            Clear
          </Link>
        )}
      </form>

      <div className="lfx-count-row">
        <p className="muted" data-testid="org-result-count">
          Showing <strong>{orgs.length}</strong> of {data.orgs.length} organization
          {data.orgs.length === 1 ? "" : "s"}
        </p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState
          title="No organization matches"
          action={
            <Link className="btn" href={basePath}>
              Clear filters
            </Link>
          }
        >
          Try a different name or technology.
        </EmptyState>
      ) : (
        <>
          <div className="lfx-org-grid" data-testid="program-org-grid">
            {pageSlice(orgs, page).map((org) => {
              const range = yearRange(org.years);
              const blurb = org.tagline ?? org.description;
              return (
                <Link
                  key={org.slug}
                  href={`${basePath}/organizations/${org.slug}`}
                  className="card hover lfx-org-card"
                >
                  <div className="lfx-org-card-top">
                    <ProgramOrgLogo src={org.logo} name={org.name} size={52} />
                    <div className="lfx-org-card-title-wrap">
                      <h3 className="lfx-org-card-title">{org.name}</h3>
                      {range && <span className="pill lfx-org-latest-pill">{range}</span>}
                    </div>
                  </div>
                  {blurb ? (
                    <p className="muted lfx-org-card-desc">{blurb}</p>
                  ) : (
                    <p className="dim lfx-org-card-desc" style={{ fontStyle: "italic" }}>
                      {data.name} participant
                    </p>
                  )}
                  {org.tags.length > 0 && (
                    <div className="chips lfx-org-card-tech">
                      {org.tags.slice(0, 4).map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                      {org.tags.length > 4 && (
                        <span className="dim" style={{ fontSize: 11, alignSelf: "center" }}>
                          +{org.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="lfx-org-card-footer">
                    <div className="lfx-org-stats">
                      {org.chats.length > 0 && (
                        <span className="lfx-org-stat-item">
                          {org.chats.map((c) => c.platform).filter((p, i, a) => a.indexOf(p) === i).map(cap).join(" · ")}
                        </span>
                      )}
                    </div>
                    <span className="lfx-org-explore-link">Explore Organization →</span>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pager path={basePath} params={{ q: filter.q, tech: filter.tech, year: filter.year }} page={page} total={orgs.length} />
        </>
      )}
    </div>
  );
}

function cap(p: string) {
  return p === "other" ? "Chat" : p === "irc" ? "IRC" : p.charAt(0).toUpperCase() + p.slice(1);
}
