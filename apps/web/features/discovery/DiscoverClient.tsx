"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DiscoveryOrgCard, type DiscoverOrg } from "@/features/discovery/DiscoveryOrgCard";
import { Notice } from "@/components/feedback/Notice";

const norm = (s: string) => s.toLowerCase().trim();

/** A program filter: a whole program ("gsoc") or one LFX foundation ("lfx-mentorship/CNCF"). */
export interface ProgramFacet {
  key: string;
  label: string;
  /** indexes of the organizations in it (same indexing as facetOrgs) */
  orgs: number[];
}

/** /discover URL for these programs and interests */
function discoverUrl(programs: string[], interests: string[]) {
  const params = new URLSearchParams();
  for (const p of programs) params.append("p", p);
  for (const i of interests) params.append("i", i);
  const q = params.toString();
  return `/discover${q ? `?${q}` : ""}`;
}

export function DiscoverClient({
  allOrgs,
  facets,
  initialInterests,
  initialPrograms = [],
  programFacets = [],
  savedSet,
  facetOrgs = [],
}: {
  allOrgs: DiscoverOrg[];
  facets: string[];
  initialInterests: string[];
  initialPrograms?: string[];
  programFacets?: ProgramFacet[];
  savedSet: string[];
  /** for each facet (same order), the indexes of the organizations that carry it */
  facetOrgs?: number[][];
}) {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [programs, setPrograms] = useState<string[]>(initialPrograms);
  const [showPicker, setShowPicker] = useState(false);
  const [pendingInterests, setPendingInterests] = useState<string[]>([]);
  const [pendingPrograms, setPendingPrograms] = useState<string[]>([]);
  const programLabel = (key: string) => programFacets.find((f) => f.key === key)?.label ?? key;
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

  // programs narrow the list (any of them); interests then match on technologies and topics
  const filtering = interests.length > 0 || programs.length > 0;
  const matched = filtering
    ? allOrgs
        .filter((org) => !programs.length || programs.some((p) => org.programKeys?.includes(p)))
        .map((org) => ({
          org,
          hits: interests.filter((i) =>
            [...org.technologies, ...org.topics].some((t) => norm(t) === norm(i)),
          ),
        }))
        .filter((m) => !interests.length || m.hits.length > 0)
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
    const byInterest = new Set<number>();
    for (const p of pendingInterests) {
      const i = facetIndex.get(norm(p));
      if (i !== undefined) for (const o of facetOrgs[i] ?? []) byInterest.add(o);
    }
    if (!pendingPrograms.length) return byInterest.size;
    const byProgram = new Set<number>();
    for (const p of pendingPrograms)
      for (const o of programFacets.find((f) => f.key === p)?.orgs ?? []) byProgram.add(o);
    if (!pendingInterests.length) return byProgram.size;
    let n = 0;
    for (const o of byProgram) if (byInterest.has(o)) n++;
    return n;
  })();
  const pendingTotal = pendingInterests.length + pendingPrograms.length;

  function openPicker() {
    setPendingInterests([...interests]);
    setPendingPrograms([...programs]);
    setSearchQuery("");
    setShowPicker(true);
  }

  function togglePendingProgram(key: string) {
    setPendingPrograms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key],
    );
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
    setPrograms([...pendingPrograms]);
    setShowPicker(false);
    router.replace(discoverUrl(pendingPrograms, pendingInterests), { scroll: false });
  }

  function clearInterests() {
    setInterests([]);
    setPrograms([]);
    setPendingInterests([]);
    setPendingPrograms([]);
    setShowPicker(false);
    router.replace("/discover", { scroll: false });
  }

  const q = searchQuery.trim().toLowerCase();
  const filteredFacets = q ? facets.filter((f) => f.toLowerCase().includes(q)) : facets;
  const filteredPrograms = q
    ? programFacets.filter((f) => f.label.toLowerCase().includes(q) || f.key.includes(q))
    : programFacets;

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
          {filtering ? `Filters (${interests.length + programs.length})` : "Select your interests"}
        </button>

        {filtering && (
          <>
            <div className="chips" style={{ gap: 6 }}>
              {programs.map((p) => (
                <span key={p} className="tag discover-program-chip">
                  {programLabel(p)}
                  <button
                    type="button"
                    onClick={() => {
                      const next = programs.filter((x) => x !== p);
                      setPrograms(next);
                      router.replace(discoverUrl(next, interests), { scroll: false });
                    }}
                    aria-label={`Remove ${programLabel(p)}`}
                  >
                    ×
                  </button>
                </span>
              ))}
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
                      router.replace(discoverUrl(programs, next), { scroll: false });
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
      {filtering && (
        <section className="block" aria-labelledby="res-h" style={{ marginTop: 28 }}>
          {matched.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>No matches for these filters</h3>
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
                filters. Ordered by coverage and participation depth.
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
            className="modal-card picker-modal"
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
              Pick programs to see all their organizations, and up to 8 languages and technologies
              to narrow them down.
            </p>

            {/* Quick search input */}
            <input
              type="search"
              placeholder="Search programs, languages and technologies..."
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
            {pendingTotal > 0 && (
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
                  Selected (
                  {pendingPrograms.length > 0 &&
                    `${pendingPrograms.length} program${pendingPrograms.length === 1 ? "" : "s"} · `}
                  {pendingInterests.length}/8 interests)
                </div>
                <div className="chips" style={{ gap: 6, flexWrap: "wrap" }}>
                  {pendingPrograms.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="interest program"
                      aria-pressed="true"
                      onClick={() => togglePendingProgram(p)}
                      style={{ cursor: "pointer", fontSize: 12, padding: "4px 10px" }}
                    >
                      {programLabel(p)} ×
                    </button>
                  ))}
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

            {/* Programs, then languages and technologies */}
            <div className="picker-list">
              {filteredPrograms.length > 0 && (
                <section className="picker-section" aria-label="Programs">
                  <div className="picker-heading">
                    Programs <span>{filteredPrograms.length}</span>
                  </div>
                  <div className="chips picker-chips" data-testid="program-facets">
                    {filteredPrograms.map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        className={`interest program${f.key.includes("/") ? " foundation" : ""}`}
                        aria-pressed={pendingPrograms.includes(f.key)}
                        onClick={() => togglePendingProgram(f.key)}
                      >
                        {f.label}
                        <span className="interest-count">{f.orgs.length}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {filteredPrograms.length > 0 && filteredFacets.length > 0 && (
                <hr className="picker-divider" />
              )}
              {filteredFacets.length > 0 && (
                <section className="picker-section" aria-label="Languages and technologies">
                  <div className="picker-heading">
                    Languages &amp; technologies <span>{filteredFacets.length}</span>
                  </div>
                  <div className="chips picker-chips">
                    {filteredFacets.map((f) => {
                      const on = pendingInterests.some((p) => norm(p) === norm(f));
                      const n = facetOrgs[facetIndex.get(norm(f)) ?? -1]?.length;
                      return (
                        <button
                          key={f}
                          type="button"
                          className="interest"
                          aria-pressed={on}
                          onClick={() => togglePending(f)}
                        >
                          {f}
                          {n ? <span className="interest-count">{n}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
              {filteredPrograms.length === 0 && filteredFacets.length === 0 && (
                <p className="picker-empty">Nothing matches &ldquo;{searchQuery.trim()}&rdquo;.</p>
              )}
            </div>

            <div className="modal-actions">
              {pendingTotal > 0 && facetOrgs.length > 0 && (
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
              {pendingTotal > 0 && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => {
                    setPendingInterests([]);
                    setPendingPrograms([]);
                  }}
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
                {pendingTotal > 0 ? `Apply (${pendingTotal})` : "Apply"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
