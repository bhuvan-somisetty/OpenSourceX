"use client";

import Link from "next/link";
import { SaveButton } from "@/features/saved/SaveButton";
import { orgEntityId } from "@/lib/org-ids";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { EmptyState } from "@/components/feedback/Notice";
import { ProgramOrgLogo } from "@/features/programs/ProgramOrgLogo";

/** What a directory card needs; kept small because every organization ships to the browser. */
export interface DirectoryOrg {
  slug: string;
  name: string;
  blurb: string | null;
  tags: string[];
  years: number[];
  logo: string | null;
  logoOnDark?: boolean;
  chats: string[];
}

const PAGE = 48;

function range(years: number[]) {
  if (years.length === 0) return null;
  const s = [...years].sort((a, b) => a - b);
  return s.length === 1 ? String(s[0]) : `${s[0]}–${s[s.length - 1]}`;
}

/**
 * Rank like the LFX directory: name or slug starts with the text, then a word in the name
 * starts with it, then the name contains it, then a technology, then the description.
 */
function rank(org: DirectoryOrg, q: string): number {
  const name = org.name.toLowerCase();
  const slug = org.slug.toLowerCase();
  if (name.startsWith(q) || slug.startsWith(q)) return 1;
  if (name.split(/[\s\-_./()]+/).some((w) => w.startsWith(q))) return 2;
  if (name.includes(q) || slug.includes(q)) return 3;
  if (org.tags.some((t) => t.toLowerCase().includes(q))) return 4;
  if ((org.blurb ?? "").toLowerCase().includes(q)) return 5;
  return 99;
}

function cap(p: string) {
  return p === "other" ? "Chat" : p === "irc" ? "IRC" : p.charAt(0).toUpperCase() + p.slice(1);
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="porg-hit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Live-filtering grid of a program's organizations: results update on every keystroke. */
export function ProgramOrgDirectory({
  orgs,
  programName,
  years,
  basePath,
  initial,
  programSlug,
  savedIds = [],
  keepQuery,
}: {
  orgs: DirectoryOrg[];
  programName: string;
  years: number[];
  basePath: string;
  initial: { q?: string; tech?: string; year?: string };
  programSlug: string;
  /** saved-item keys of this session, e.g. "ORGANIZATION:org:gsoc/alaska" */
  savedIds?: string[];
  /** query parameters to keep in the URL while filtering, e.g. { f: "lfdt" } */
  keepQuery?: Record<string, string>;
}) {
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);
  const router = useRouter();
  const [query, setQuery] = useState(initial.q ?? "");
  const [tech, setTech] = useState(initial.tech ?? "");
  const [year, setYear] = useState(initial.year ?? "");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tags = useMemo(() => {
    const m = new Map<string, { value: string; n: number }>();
    for (const o of orgs)
      for (const t of o.tags) {
        const k = t.toLowerCase();
        const cur = m.get(k) ?? { value: t, n: 0 };
        cur.n++;
        m.set(k, cur);
      }
    return [...m.values()]
      .sort((a, b) => b.n - a.n || a.value.localeCompare(b.value))
      .slice(0, 150);
  }, [orgs]);

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    const t = tech.toLowerCase();
    const y = year ? Number(year) : null;
    const base = orgs.filter(
      (o) => (!t || o.tags.some((x) => x.toLowerCase() === t)) && (!y || o.years.includes(y)),
    );
    if (!q) return base;
    return base
      .map((o) => ({ o, s: rank(o, q) }))
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s || a.o.name.localeCompare(b.o.name))
      .map((x) => x.o);
  }, [orgs, q, tech, year]);

  const suggestions = useMemo(
    () => (q ? results.filter((o) => rank(o, q) <= 3).slice(0, 10) : []),
    [results, q],
  );

  // keep the URL in step so a filtered view can be shared or reloaded
  useEffect(() => {
    const p = new URLSearchParams(keepQuery);
    if (query.trim()) p.set("q", query.trim());
    if (tech) p.set("tech", tech);
    if (year) p.set("year", year);
    const s = p.toString();
    window.history.replaceState(null, "", s ? `${basePath}?${s}` : basePath);
    setShown(PAGE);
  }, [query, tech, year, basePath]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (slug: string) => {
    setOpen(false);
    router.push(`${basePath}/organizations/${slug}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return setOpen(false);
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && q) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      const s = suggestions[active];
      if (s) go(s.slug);
    }
  };

  const filtered = Boolean(q || tech || year);

  return (
    <div>
      <div className="toolbar lfx-toolbar" role="search" aria-label="Filter organizations">
        <div ref={boxRef} className="field lfx-search-field porg-search">
          <label htmlFor="porg-q">Search organizations</label>
          <div className="porg-search-box">
            <input
              ref={inputRef}
              id="porg-q"
              type="search"
              value={query}
              autoComplete="off"
              placeholder="Type to search, e.g. 'k' or 'ab'"
              aria-autocomplete="list"
              aria-controls="porg-suggest"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(-1);
              }}
              onFocus={() => q && setOpen(true)}
              onKeyDown={onKey}
              data-testid="program-search-input"
            />
            {query && (
              <button
                type="button"
                className="porg-clear"
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  inputRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}
          </div>
          {open && q && (
            <div className="lfx-autocomplete-pop porg-suggest" role="listbox" id="porg-suggest">
              <div className="porg-suggest-head">
                <span>Organizations matching &ldquo;{query.trim()}&rdquo;</span>
                <span className="dim">
                  {suggestions.length === 10 ? "10+" : suggestions.length}
                </span>
              </div>
              {suggestions.length === 0 ? (
                <div className="porg-suggest-empty">
                  No organization name matches. The grid below also searches technologies and
                  descriptions.
                </div>
              ) : (
                suggestions.map((o, i) => (
                  <div
                    key={o.slug}
                    role="option"
                    aria-selected={i === active}
                    className={`porg-suggest-item${i === active ? " is-active" : ""}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      go(o.slug);
                    }}
                  >
                    <ProgramOrgLogo src={o.logo} name={o.name} size={28} dark={o.logoOnDark} />
                    <span className="porg-suggest-name">
                      <Highlight text={o.name} q={q} />
                    </span>
                    {range(o.years) && (
                      <span className="dim porg-suggest-years">{range(o.years)}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {tags.length > 0 && (
          <div className="field">
            <label htmlFor="porg-tech">Technology</label>
            <select id="porg-tech" value={tech} onChange={(e) => setTech(e.target.value)}>
              <option value="">All technologies</option>
              {tags.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} ({t.n})
                </option>
              ))}
            </select>
          </div>
        )}
        {years.length > 1 && (
          <div className="field">
            <label htmlFor="porg-year">Year</label>
            <select id="porg-year" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}
        {filtered && (
          <button
            type="button"
            className="btn sm porg-reset"
            onClick={() => {
              setQuery("");
              setTech("");
              setYear("");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="lfx-count-row">
        <p className="muted" data-testid="org-result-count" aria-live="polite">
          Showing <strong>{Math.min(shown, results.length)}</strong> of {results.length}
          {filtered
            ? ` matching (${orgs.length} in total)`
            : ` organization${orgs.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No organization matches"
          action={
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQuery("");
                setTech("");
                setYear("");
              }}
            >
              Clear filters
            </button>
          }
        >
          Try a different name or technology.
        </EmptyState>
      ) : (
        <>
          <div className="lfx-org-grid" data-testid="program-org-grid">
            {results.slice(0, shown).map((org) => {
              const yr = range(org.years);
              return (
                <div key={org.slug} className="org-card-wrap">
                  <Link
                    href={`${basePath}/organizations/${org.slug}`}
                    className="card hover lfx-org-card"
                  >
                    <div className="lfx-org-card-top">
                      <ProgramOrgLogo
                        src={org.logo}
                        name={org.name}
                        size={52}
                        dark={org.logoOnDark}
                      />
                      <div className="lfx-org-card-title-wrap">
                        <h3 className="lfx-org-card-title">
                          <Highlight text={org.name} q={q} />
                        </h3>
                        {yr && <span className="pill lfx-org-latest-pill">{yr}</span>}
                      </div>
                    </div>
                    {org.blurb ? (
                      <p className="muted lfx-org-card-desc">{org.blurb}</p>
                    ) : (
                      <p className="dim lfx-org-card-desc" style={{ fontStyle: "italic" }}>
                        {programName} participant
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
                            {org.chats.map(cap).join(" · ")}
                          </span>
                        )}
                      </div>
                      <span className="lfx-org-explore-link">Explore Organization →</span>
                    </div>
                  </Link>
                  <div className="org-card-save">
                    <SaveButton
                      entityType="ORGANIZATION"
                      entityId={orgEntityId(programSlug, org.slug)}
                      initialSaved={savedSet.has(
                        `ORGANIZATION:${orgEntityId(programSlug, org.slug)}`,
                      )}
                      compact
                      label={org.name}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {shown < results.length && (
            <div className="porg-more">
              <button type="button" className="btn" onClick={() => setShown((n) => n + PAGE)}>
                Show more ({results.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
