# M1a Findings

M1a is a local, read-only spike over **recorded, sanitized snapshots**. It did
not crawl any source. Recording fetched one small sample (3 GSoC orgs, 3 LFX
projects by id, 3 CNCF programs) for local research, and sanitized it
immediately. Production ingestion remains blocked on Q2 and Q18.

## What was validated

`recorded snapshot -> validate -> sanitize gate -> normalize -> resolve ->
persist -> provenance`, in real PostgreSQL, with tests. Implemented in
`services/providers` (sanitizers, registry), `services/entity-resolution` (terms, GitHub
URL parsing, resolution) and `services/ingestion` (pipeline). Migration 002 adds
the typed tables.

## Findings from real data

1. **The LFX API returns an LFID.** Every project record has a project-level
   `lfid` field. The allowlist sanitizer drops it (tested).
2. **LFX `repoLink` can be an issue URL**, not only a repo or org URL (all 3
   sampled). Resolution derives the repository from the URL and labels it
   INFERRED because no GitHub id is verified yet.
3. **Source authority bug caught by the idempotency test.** The CNCF pass was
   overwriting LFX-owned title and repo link, so a re-run produced revisions.
   Rule now: the LFX API owns title and repo link; CNCF only adds ecosystem
   attributes and creates a row if the offering is missing.
4. **Canonical term windows vary per project.** Project start dates within a
   term differ by days. The canonical term keeps the first-seen window and
   never overwrites it. M1b should derive the window from aggregates.
5. **Sample coverage is not representative.** The recorder picked CNCF
   programs that exist in the LFX API; earlier research found 26 of 59 do
   not. Do not read the spike counts as coverage figures.

## Deliberate M1a simplifications (all tracked)

- No `project`/`repository` tables: repository ids need the GitHub API (M3).
  Upstream links are `entity_link` rows keyed by canonical URL, INFERRED.
- LFX/CNCF participation lives in `mentorship_project_term`;
  `participation` rows with grain `project_term` arrive once projects resolve
  (M1b). The M1a `participation` table allows only `organization_year`, so
  GSoC project-level data cannot be inserted.
- Mentors without a valid public GitHub handle are counted, not stored
  ("mentor not verified"); name-only identity would need name matching.
- GSoC `contact_links` and comm-method fields are not kept (they can hold
  contact data); community-channel mapping is deferred.
- `person_role` is scoped to `mentorship_project_id`; the design's other
  scope columns arrive with their tables.
- Term status is derived by `derivedTermStatus` from dates; it is not yet
  materialized in the database.

## Not done (still blocked)

Any live fetch or scheduling of GSoC, LFX or CNCF data; automatic sync; the
review queue for ambiguous links (Q23).
