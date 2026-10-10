"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LfxOrgSummary } from "@opensourcex/database";
import { OrgLogo } from "@/components/ui/OrgLogo";
import { EmptyState } from "@/components/feedback/Notice";

interface LfxOrgDirectoryProps {
  organizations: LfxOrgSummary[];
  allOrganizations?: LfxOrgSummary[];
  total: number;
  facets: {
    years: number[];
    terms: string[];
    technologies: { value: string; n: number }[];
  };
  params: {
    q?: string;
    tech?: string;
    year?: string;
    term?: string;
  };
  basePath?: string;
}

/**
 * Highlights matching letters in an organization name based on user query.
 */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);

  if (idx === -1) {
    return <span>{text}</span>;
  }

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <span>
      {before}
      <span
        style={{
          color: "#38bdf8",
          fontWeight: 800,
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        {match}
      </span>
      {after}
    </span>
  );
}

export function LfxOrgDirectory({
  organizations,
  allOrganizations,
  total,
  facets,
  params,
  basePath = "/programs/lfx-mentorship",
}: LfxOrgDirectoryProps) {
  const router = useRouter();
  const searchSource = allOrganizations && allOrganizations.length > 0 ? allOrganizations : organizations;

  const [query, setQuery] = useState(params.q ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasFilter = Boolean(params.q || params.tech || params.year || params.term);

  // Filter organizations for letterwise autocomplete
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return searchSource
      .map((org) => {
        const nameLower = org.name.toLowerCase();
        const slugLower = org.slug.toLowerCase();

        // Exact / prefix match on full name gets highest priority (score 1)
        if (nameLower.startsWith(q) || slugLower.startsWith(q)) {
          return { org, score: 1 };
        }

        // Word boundary match gets secondary priority (score 2)
        const words = nameLower.split(/[\s-_]+/);
        if (words.some((w) => w.startsWith(q))) {
          return { org, score: 2 };
        }

        // Substring match in name gets score 3
        if (nameLower.includes(q) || slugLower.includes(q)) {
          return { org, score: 3 };
        }

        // Match in technologies gets score 4
        if (org.technologies.some((t) => t.toLowerCase().includes(q))) {
          return { org, score: 4 };
        }

        return { org, score: 99 };
      })
      .filter((item) => item.score < 99)
      .sort((a, b) => a.score - b.score || a.org.name.localeCompare(b.org.name))
      .map((item) => item.org)
      .slice(0, 12);
  }, [query, searchSource]);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation for dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && query.trim().length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selected) {
          router.push(`${basePath}/organizations/${selected.slug}`);
          setIsOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelectOrg = (slug: string) => {
    setIsOpen(false);
    router.push(`${basePath}/organizations/${slug}`);
  };

  return (
    <div className="lfx-directory-wrap">
      <form className="toolbar lfx-toolbar" method="get">
        <input type="hidden" name="tab" value="organizations" />

        <div
          ref={searchContainerRef}
          className="field lfx-search-field"
          style={{ position: "relative", minWidth: 260, flex: "1 1 280px" }}
        >
          <label htmlFor="lfx-search">Search organizations</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              ref={inputRef}
              id="lfx-search"
              type="search"
              name="q"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => {
                if (query.trim().length > 0) {
                  setIsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search by name (e.g. 'k' for Kubernetes)..."
              autoComplete="off"
              style={{ width: "100%", paddingRight: query ? 36 : 14 }}
              data-testid="lfx-search-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setIsOpen(false);
                  inputRef.current?.focus();
                }}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim, #94a3b8)",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && query.trim().length > 0 && (
            <div
              className="lfx-autocomplete-pop"
              role="listbox"
              id="lfx-autocomplete-list"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                width: "100%",
                minWidth: 320,
                maxHeight: 380,
                overflowY: "auto",
                background: "var(--card-bg, #11141d)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.16))",
                borderRadius: 12,
                boxShadow: "0 18px 45px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(16px)",
                zIndex: 100,
                padding: "6px 0",
              }}
              data-testid="lfx-autocomplete-dropdown"
            >
              <div
                style={{
                  padding: "8px 14px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-dim, #94a3b8)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Organizations starting with "{query}"</span>
                <span className="dim">
                  {suggestions.length} {suggestions.length === 1 ? "result" : "results"}
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div
                  style={{
                    padding: "16px 14px",
                    textAlign: "center",
                    color: "var(--text-dim, #94a3b8)",
                    fontSize: 13,
                  }}
                >
                  No organizations found matching "<strong>{query}</strong>"
                </div>
              ) : (
                suggestions.map((org, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={org.slug}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelectOrg(org.slug)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        cursor: "pointer",
                        background: isSelected
                          ? "rgba(0, 153, 255, 0.14)"
                          : "transparent",
                        borderLeft: isSelected
                          ? "3px solid #0099ff"
                          : "3px solid transparent",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      data-testid={`lfx-suggestion-${org.slug}`}
                    >
                      <OrgLogo slug={org.slug} name={org.name} size={32} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: isSelected ? "#38bdf8" : "var(--text, #f8fafc)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          <HighlightMatch text={org.name} query={query} />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            fontSize: 12,
                            color: "var(--text-dim, #94a3b8)",
                            marginTop: 2,
                          }}
                        >
                          <span>
                            {org.projectCount} project{org.projectCount === 1 ? "" : "s"}
                          </span>
                          {org.latestTerm && (
                            <>
                              <span>·</span>
                              <span>Latest: {org.latestTerm}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 12,
                          color: isSelected ? "#38bdf8" : "var(--text-dim, #64748b)",
                          fontWeight: 500,
                          flexShrink: 0,
                        }}
                      >
                        Explore →
                      </span>
                    </div>
                  );
                })
              )}

              {/* Quick Filter Action at bottom */}
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  padding: "8px 14px",
                  fontSize: 12,
                  color: "var(--text-dim, #94a3b8)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "rgba(0, 0, 0, 0.2)",
                }}
              >
                <span>Press Enter to filter directory grid</span>
                <span className="kbd" style={{ fontSize: 10, padding: "1px 5px" }}>
                  ↵ Enter
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="lfx-tech">Technology</label>
          <select id="lfx-tech" name="tech" defaultValue={params.tech}>
            <option value="">All technologies</option>
            {facets.technologies.slice(0, 50).map((t) => (
              <option key={t.value} value={t.value}>
                {t.value} ({t.n})
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ minWidth: 120 }}>
          <label htmlFor="lfx-year">Year</label>
          <select id="lfx-year" name="year" defaultValue={params.year}>
            <option value="">All years</option>
            {facets.years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ minWidth: 110 }}>
          <label htmlFor="lfx-term">Term</label>
          <select id="lfx-term" name="term" defaultValue={params.term}>
            <option value="">All terms</option>
            <option value="T3">Term 3 (Sep–Nov)</option>
            <option value="T2">Term 2 (Jun–Aug)</option>
            <option value="T1">Term 1 (Mar–May)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <button className="btn primary sm" type="submit">
            Apply
          </button>
          {hasFilter && (
            <Link href={basePath} className="btn sm">
              Clear
            </Link>
          )}
        </div>
      </form>

      <div className="lfx-count-row">
        <p className="muted" data-testid="org-result-count">
          Showing <strong>{organizations.length}</strong> of {total} organizations
          {hasFilter && " (filtered)"}
        </p>
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          title="No organizations match your filters"
          action={
            <Link className="btn" href={basePath}>
              Clear all filters
            </Link>
          }
        >
          No recorded CNCF organization matches the current search and filter criteria.
        </EmptyState>
      ) : (
        <div className="lfx-org-grid" data-testid="lfx-org-grid">
          {organizations.map((org) => {
            const yearRange =
              org.years.length > 1
                ? `${org.years[org.years.length - 1]}–${org.years[0]}`
                : org.years.length === 1
                  ? `${org.years[0]}`
                  : "Recorded";

            return (
              <Link
                key={org.slug}
                href={`${basePath}/organizations/${org.slug}`}
                className="card hover lfx-org-card"
                data-testid={`lfx-org-card-${org.slug}`}
              >
                <div className="lfx-org-card-top">
                  <OrgLogo slug={org.slug} name={org.name} size={52} />
                  <div className="lfx-org-card-title-wrap">
                    <h3 className="lfx-org-card-title">{org.name}</h3>
                    {org.latestTerm && (
                      <span className="pill lfx-org-latest-pill">
                        Latest: {org.latestTerm}
                      </span>
                    )}
                  </div>
                </div>

                {org.description ? (
                  <p className="muted lfx-org-card-desc">{org.description}</p>
                ) : (
                  <p className="dim lfx-org-card-desc" style={{ fontStyle: "italic" }}>
                    CNCF ecosystem mentorship participant
                  </p>
                )}

                {org.technologies.length > 0 && (
                  <div className="chips lfx-org-card-tech">
                    {org.technologies.slice(0, 4).map((tech) => (
                      <span key={tech} className="tag">
                        {tech}
                      </span>
                    ))}
                    {org.technologies.length > 4 && (
                      <span className="dim" style={{ fontSize: 11, alignSelf: "center" }}>
                        +{org.technologies.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div className="lfx-org-card-footer">
                  <div className="lfx-org-stats">
                    <span className="lfx-org-stat-item">
                      <strong>{org.projectCount}</strong> recorded project{org.projectCount === 1 ? "" : "s"}
                    </span>
                    <span className="dim">·</span>
                    <span className="lfx-org-stat-item dim">
                      {yearRange}
                    </span>
                  </div>

                  <span className="lfx-org-explore-link">
                    Explore Organization →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
