"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DiscoveryOrgCard, type DiscoverOrg } from "@/features/discovery/DiscoveryOrgCard";
import { Notice } from "@/components/feedback/Notice";

const norm = (s: string) => s.toLowerCase().trim();

export function DiscoverClient({
  allOrgs,
  facets,
  initialInterests,
  savedSet,
  facetOrgs = [],
}: {
  allOrgs: DiscoverOrg[];
  facets: string[];
  initialInterests: string[];
  savedSet: string[];
  /** for each facet (same order), the indexes of the organizations that carry it */
  facetOrgs?: number[][];
}) {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingInterests, setPendingInterests] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const saved = new Set(savedSet);

  useEffect(() => {
    if (!showPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPicker(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPicker]);

  const matched = interests.length
    ? allOrgs
        .map((org) => ({
          org,
          hits: interests.filter((i) =>
            [...org.technologies, ...org.topics].some((t) => norm(t) === norm(i)),
          ),
        }))
        .filter((m) => m.hits.length > 0)
        .sort(
          (a, b) =>
            b.hits.length - a.hits.length ||
            (b.org.programs?.length ?? 1) - (a.org.programs?.length ?? 1) ||
            b.org.yearCount - a.org.yearCount ||
            b.org.projectCount - a.org.projectCount ||
            a.org.name.localeCompare(b.org.name),
        )
    : [];

  // organizations matching the picker's current selection (any of them), counted live
  const facetIndex = new Map(facets.map((f, i) => [norm(f), i]));
  const pendingCount = (() => {
    const hit = new Set<number>();
    for (const p of pendingInterests) {
      const i = facetIndex.get(norm(p));
      if (i !== undefined) for (const o of facetOrgs[i] ?? []) hit.add(o);
    }
    return hit.size;
  })();

  function openPicker() {
    setPendingInterests([...interests]);
    setSearchQuery("");
    setShowPicker(true);
  }

  function togglePending(tech: string) {
    setPendingInterests((prev) =>
      prev.some((p) => norm(p) === norm(tech))
        ? prev.filter((p) => norm(p) !== norm(tech))
        : prev.length < 8
          ? [...prev, tech]
          : prev,
    );
  }

  function applyInterests() {
    setInterests([...pendingInterests]);
    setShowPicker(false);
    const params = new URLSearchParams();
    for (const i of pendingInterests) params.append("i", i);
    router.replace(`/discover${pendingInterests.length ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  function clearInterests() {
    setInterests([]);
    setPendingInterests([]);
    setShowPicker(false);
    router.replace("/discover", { scroll: false });
  }

  const filteredFacets = searchQuery.trim()
    ? facets.filter((f) => f.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : facets;

  return (
    <>
      {/* Action bar below the hero text (after track and reasons) */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}
      >
        <button
          type="button"
          className="btn primary"
          onClick={openPicker}
          data-testid="open-interest-picker"
          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          {interests.length > 0 ? `Interests (${interests.length})` : "Select your interests"}
        </button>

        {interests.length > 0 && (
          <>
            <div className="chips" style={{ gap: 6 }}>
              {interests.map((i) => (
                <span
                  key={i}
                  className="tag accent"
                  style={{
                    background: "rgba(0, 153, 255, 0.15)",
                    color: "#38bdf8",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    fontWeight: 600,
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {i}
                  <button
                    type="button"
                    onClick={() => {
                      const next = interests.filter((x) => norm(x) !== norm(i));
                      setInterests(next);
                      const params = new URLSearchParams();
                      for (const t of next) params.append("i", t);
                      router.replace(`/discover${next.length ? `?${params.toString()}` : ""}`, {
                        scroll: false,
                      });
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                    aria-label={`Remove ${i}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={clearInterests}
              style={{ fontSize: 12 }}
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {/* Results - Only shown after user selects and applies interests */}
      {interests.length > 0 && (
        <section className="block" aria-labelledby="res-h" style={{ marginTop: 28 }}>
          {matched.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>No matches for these interests</h3>
              <p className="muted" style={{ marginBottom: 16, fontSize: 14 }}>
                Try selecting broader programming languages or ecosystem topics.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button type="button" className="btn primary sm" onClick={openPicker}>
                  Select interests
                </button>
                <button type="button" className="btn sm" onClick={clearInterests}>
                  Clear all
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className="muted"
                style={{ margin: "0 0 18px", fontSize: 14 }}
                data-testid="match-count"
              >
                {matched.length} organization{matched.length > 1 ? "s" : ""} match your selected
                interests. Ordered by coverage and participation depth.
              </p>
              <div className="lfx-org-grid" data-testid="results">
                {matched.map(({ org, hits }) => (
                  <DiscoveryOrgCard
                    key={org.id}
                    org={org}
                    hits={hits}
                    savedId={
                      (org.saveIds ?? [org.id]).find((id) => saved.has(`ORGANIZATION:${id}`)) ??
                      null
                    }
                  />
                ))}
              </div>
            </>
          )}
          <div style={{ marginTop: 24 }}>
            <Notice kind="dev">
              <strong>About these matches.</strong> They come from the organization lists of every
              program OpenSourceX tracks, matched on recorded technologies and topics.
            </Notice>
          </div>
        </section>
      )}

      {/* Interest Picker Modal (matching sign out confirmation modal design) */}
      {showPicker && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPicker(false);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interest-modal-title"
            data-testid="interest-picker-modal"
            style={{ maxWidth: 580, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          >
            <div
              className="modal-icon-badge"
              aria-hidden="true"
              style={{
                background: "rgba(0, 153, 255, 0.12)",
                border: "1px solid rgba(0, 153, 255, 0.3)",
                color: "#0099ff",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </div>

            <h2 id="interest-modal-title" className="modal-title">
              Select your interests
            </h2>
            <p className="modal-description" style={{ marginBottom: 14 }}>
              Choose up to 8 programming languages and technologies to filter matching
              organizations.
            </p>

            {/* Quick search input */}
            <input
              type="search"
              placeholder="Search languages and technologies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                marginBottom: 14,
                outline: "none",
              }}
            />

            {/* Currently selected items in modal */}
            {pendingInterests.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-dim, #94a3b8)",
                    marginBottom: 6,
                  }}
                >
                  Selected ({pendingInterests.length}/8)
                </div>
                <div className="chips" style={{ gap: 6, flexWrap: "wrap" }}>
                  {pendingInterests.map((i) => (
                    <button
                      key={i}
                      type="button"
                      className="interest"
                      aria-pressed="true"
                      onClick={() => togglePending(i)}
                      style={{
                        background: "rgba(0, 153, 255, 0.18)",
                        color: "#38bdf8",
                        border: "1px solid rgba(56, 189, 248, 0.45)",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: "4px 10px",
                      }}
                    >
                      {i} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All available languages and technologies */}
            <div
              style={{
                flex: 1,
                minHeight: 180,
                maxHeight: 280,
                overflowY: "auto",
                paddingRight: 4,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-dim, #94a3b8)",
                  marginBottom: 8,
                }}
              >
                All languages & technologies ({filteredFacets.length})
              </div>
              <div className="chips" style={{ gap: 8, flexWrap: "wrap" }}>
                {filteredFacets.map((f) => {
                  const on = pendingInterests.some((p) => norm(p) === norm(f));
                  return (
                    <button
                      key={f}
                      type="button"
                      className="interest"
                      aria-pressed={on}
                      onClick={() => togglePending(f)}
                      style={{ cursor: "pointer", fontSize: 13 }}
                    >
                      {f}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              {pendingInterests.length > 0 && facetOrgs.length > 0 && (
                <span className="picker-count" aria-live="polite" data-testid="picker-count">
                  <strong>{pendingCount}</strong>{" "}
                  {pendingCount === 1 ? "organization matches" : "organizations match"}
                </span>
              )}
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowPicker(false)}
                data-testid="cancel-interest-picker"
              >
                Cancel
              </button>
              {pendingInterests.length > 0 && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setPendingInterests([])}
                  style={{ color: "var(--text-dim)" }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="btn primary sm"
                onClick={applyInterests}
                data-testid="apply-interests"
              >
                {pendingInterests.length > 0 ? `Apply (${pendingInterests.length})` : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
